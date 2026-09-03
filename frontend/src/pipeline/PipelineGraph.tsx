import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { usePipelineStore } from './pipelineStore';
import NodePanel from './NodePanel';
import { type PipelineTheme, type PipelineColorMode, getTheme, loadColorMode, saveColorMode } from './pipelineTheme';

let dagreRegistered = false;
if (!dagreRegistered) {
  cytoscape.use(dagre as cytoscape.Ext);
  dagreRegistered = true;
}

export type DisplayMode = 'labeled' | 'dots';

const TYPE_SHAPE: Record<string, string> = {
  step: 'roundrectangle', decision: 'diamond', milestone: 'star', review: 'hexagon',
};

function buildCyStyle(t: PipelineTheme, display: DisplayMode) {
  const labeled = display === 'labeled';
  return [
    {
      selector: 'core',
      style: { 'active-bg-color': 'transparent', 'active-bg-opacity': 0 } as cytoscape.Css.Core,
    },

    // ── Base node ────────────────────────────────────────────────────────────
    {
      selector: 'node',
      style: {
        'width':  labeled ? 210 : 44,
        'height': labeled ? 72  : 44,
        'shape': 'roundrectangle',
        'background-opacity': 0,
        'border-color': t.nodePendingBorder,
        'border-width': 2,
        'label': 'data(label)',
        'text-wrap': 'ellipsis',
        'text-max-width': labeled ? '182px' : '70px',
        'text-valign': labeled ? 'center' : 'bottom',
        'text-halign': 'center',
        'text-margin-y': labeled ? 0 : 10,
        'color': t.nodePendingText,
        'font-size': labeled ? '13px' : '10px',
        'font-weight': 600,
        'font-family': 'ui-sans-serif, system-ui, sans-serif',
        // Tiny backdrop behind the label so it's readable over the dot grid
        'text-background-color': t.bgMain,
        'text-background-opacity': labeled ? 0.82 : 0,
        'text-background-padding': '4px',
        'text-background-shape': 'roundrectangle',
        'transition-property': 'border-color, border-width, shadow-blur',
        'transition-duration': '0.2s',
      },
    },

    // ── Status: in-progress ──────────────────────────────────────────────────
    {
      selector: 'node[status = "in-progress"]',
      style: {
        'border-color': t.nodeInProgressBorder,
        'border-width': 2.5,
        'color': t.nodeInProgressText,
        'shadow-blur': 28,
        'shadow-color': t.nodeInProgressBorder,
        'shadow-opacity': 0.7,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      },
    },

    // ── Status: done ─────────────────────────────────────────────────────────
    {
      selector: 'node[status = "done"]',
      style: {
        'border-color': t.nodeDoneBorder,
        'border-width': 2,
        'color': t.nodeDoneText,
        'shadow-blur': 22,
        'shadow-color': t.nodeDoneBorder,
        'shadow-opacity': 0.55,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      },
    },

    // ── Type accents (border hue shift, only when pending so status wins) ───
    { selector: 'node[type = "decision"][status = "pending"]',  style: { 'border-color': '#f59e0b', 'border-width': 2 } },
    { selector: 'node[type = "milestone"][status = "pending"]', style: { 'border-color': '#a78bfa', 'border-width': 2 } },
    { selector: 'node[type = "review"][status = "pending"]',    style: { 'border-color': '#f472b6', 'border-width': 2 } },

    // ── Selected ─────────────────────────────────────────────────────────────
    {
      selector: 'node:selected',
      style: {
        'border-color': '#818cf8',
        'border-width': 3,
        'shadow-blur': 30,
        'shadow-color': '#6366f1',
        'shadow-opacity': 0.85,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      },
    },

    // ── Blocking: pending node that other nodes depend on ────────────────────
    {
      selector: 'node[?blocking]',
      style: {
        'border-color': '#f97316',
        'border-width': 3,
        'shadow-blur': 22,
        'shadow-color': '#f97316',
        'shadow-opacity': 0.55,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      },
    },

    // ── Edges ────────────────────────────────────────────────────────────────
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': t.edgeColor,
        'target-arrow-color': t.edgeColor,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.3,
        'opacity': 1,
      },
    },
    {
      selector: 'edge[?fromDone]',
      style: {
        'line-color': t.nodeDoneBorder,
        'target-arrow-color': t.nodeDoneBorder,
        'opacity': 0.45,
      },
    },
  ] as cytoscape.StylesheetStyle[];
}

export default function PipelineGraph() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const { currentTask, selectedNodeId, panelOpen, graphLoading, error, loadTask, createNode } = usePipelineStore();

  const containerRef    = useRef<HTMLDivElement>(null);
  const cyRef           = useRef<cytoscape.Core | null>(null);
  const layoutApplied   = useRef(false);
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [addingNode,    setAddingNode]    = useState(false);
  const [newNodeTitle,  setNewNodeTitle]  = useState('');
  const [layoutName,    setLayoutName]    = useState<'dagre' | 'breadthfirst' | 'grid' | 'free'>('dagre');
  const [displayMode,   setDisplayMode]   = useState<DisplayMode>('labeled');
  const [colorMode,     setColorMode]     = useState<PipelineColorMode>(loadColorMode);

  const t = getTheme(colorMode);

  const toggleColorMode = () => {
    const next: PipelineColorMode = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(next);
    saveColorMode(next);
  };

  // ── Load task ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (taskId) { layoutApplied.current = false; loadTask(taskId); }
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create cy once ───────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements: [],
      style: buildCyStyle(getTheme(loadColorMode()), 'labeled'),
      wheelSensitivity: 0.3,
      minZoom: 0.15,
      maxZoom: 3,
      styleEnabled: true,
    });
    // Make all Cytoscape canvas layers transparent so our gradient shows through
    container.querySelectorAll('canvas').forEach(c => { c.style.background = 'transparent'; });
    cyRef.current = cy;

    cy.on('tap', 'node', evt => {
      usePipelineStore.getState().setSelectedNodeId(evt.target.id());
      usePipelineStore.getState().setPanelOpen(true);
    });
    cy.on('tap', evt => {
      if (evt.target === cy) {
        usePipelineStore.getState().setSelectedNodeId(null);
        usePipelineStore.getState().setPanelOpen(false);
      }
    });
    cy.on('dragfree', 'node', evt => {
      const pos = evt.target.position();
      usePipelineStore.getState().updateNode(evt.target.id(), {
        position_x: Math.round(pos.x),
        position_y: Math.round(pos.y),
      });
    });

    return () => { cy.destroy(); cyRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-apply style when theme or display mode changes ───────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style(buildCyStyle(t, displayMode)).update();
    cy.nodes().forEach(n => {
      const type = n.data('type') as string || 'step';
      n.style('shape', (TYPE_SHAPE[type] || 'roundrectangle') as cytoscape.Css.NodeShape);
    });
  }, [t, displayMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync task data ───────────────────────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !currentTask) return;

    cy.batch(() => {
      cy.nodes().forEach(n => {
        if (!currentTask.nodes.find(nd => nd.id === n.id())) cy.remove(n);
      });
      cy.edges().forEach(e => {
        if (!currentTask.edges.find(ed => ed.id === e.id())) cy.remove(e);
      });

      currentTask.nodes.forEach(n => {
        const shp = (TYPE_SHAPE[n.type] || 'roundrectangle') as cytoscape.Css.NodeShape;
        const existing = cy.getElementById(n.id);
        if (existing.length === 0) {
          cy.add({
            group: 'nodes',
            data: { id: n.id, label: n.title || 'Untitled', status: n.status, type: n.type },
            style: { shape: shp },
            position: n.position_x || n.position_y
              ? { x: n.position_x, y: n.position_y }
              : { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
          });
        } else {
          existing.data('label', n.title || 'Untitled');
          existing.data('status', n.status);
          existing.data('type', n.type);
          if (displayMode !== 'dots') existing.style('shape', shp);
        }
      });

      currentTask.edges.forEach(e => {
        if (cy.getElementById(e.id).length === 0) {
          const srcDone = currentTask.nodes.find(n => n.id === e.source_id)?.status === 'done';
          cy.add({
            group: 'edges',
            data: { id: e.id, source: e.source_id, target: e.target_id, fromDone: srcDone || undefined },
          });
        }
      });
    });

    // Mark blocking nodes: pending nodes that block another pending/in-progress node
    const nodeStatusMap = new Map(currentTask.nodes.map(n => [n.id, n.status]));
    const blockingIds = new Set<string>();
    currentTask.edges.forEach(e => {
      const srcStatus = nodeStatusMap.get(e.source_id);
      const tgtStatus = nodeStatusMap.get(e.target_id);
      if (srcStatus === 'pending' && (tgtStatus === 'pending' || tgtStatus === 'in-progress')) {
        blockingIds.add(e.source_id);
      }
    });
    cy.nodes().forEach(n => { n.data('blocking', blockingIds.has(n.id()) ? true : false); });

    if (!layoutApplied.current && currentTask.nodes.length > 0) {
      const hasSaved = currentTask.nodes.some(n => n.position_x || n.position_y);
      if (!hasSaved) {
        cy.layout({ name: 'dagre', rankDir: 'LR', nodeSep: 50, rankSep: 130 } as cytoscape.LayoutOptions).run();
      }
      layoutApplied.current = true;
    }
  }, [currentTask]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pulse animation for in-progress nodes ────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (pulseIntervalRef.current) { clearInterval(pulseIntervalRef.current); pulseIntervalRef.current = null; }
    if (!cy) return;

    let phase = false;
    pulseIntervalRef.current = setInterval(() => {
      const nodes = cyRef.current?.nodes('[status = "in-progress"]');
      if (!nodes || nodes.length === 0) return;
      phase = !phase;
      nodes.animate({
        style: {
          'border-width': phase ? 3.5 : 1.5,
          'shadow-opacity': phase ? 0.9 : 0.3,
        } as cytoscape.Css.Node,
        duration: 800,
        easing: 'ease-in-out',
      });
    }, 800);

    return () => { if (pulseIntervalRef.current) { clearInterval(pulseIntervalRef.current); pulseIntervalRef.current = null; } };
  }, [currentTask]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Arrow-key canvas navigation ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const cy = cyRef.current;
      if (!cy) return;

      const step = e.shiftKey ? 180 : 60;
      switch (e.key) {
        case 'ArrowLeft':  cy.panBy({ x:  step, y: 0     }); e.preventDefault(); break;
        case 'ArrowRight': cy.panBy({ x: -step, y: 0     }); e.preventDefault(); break;
        case 'ArrowUp':    cy.panBy({ x: 0,     y:  step }); e.preventDefault(); break;
        case 'ArrowDown':  cy.panBy({ x: 0,     y: -step }); e.preventDefault(); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Highlight selected ───────────────────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedNodeId) cy.getElementById(selectedNodeId).select();
  }, [selectedNodeId]);

  // ── Layout ───────────────────────────────────────────────────────────────
  const runLayout = useCallback((name: typeof layoutName) => {
    const cy = cyRef.current;
    if (!cy) return;
    setLayoutName(name);
    if (name === 'free') return;
    const opts: cytoscape.LayoutOptions = name === 'dagre'
      ? { name: 'dagre', rankDir: 'LR', nodeSep: 50, rankSep: 130 } as cytoscape.LayoutOptions
      : { name, padding: 50 } as cytoscape.LayoutOptions;
    cy.layout(opts).run();
  }, []);

  // ── Add node ─────────────────────────────────────────────────────────────
  const handleAddNode = async () => {
    if (!newNodeTitle.trim()) return;
    const cy = cyRef.current;
    const ext = cy?.extent();
    const x = ext ? Math.round((ext.x1 + ext.x2) / 2 + (Math.random() - 0.5) * 200) : 200;
    const y = ext ? Math.round((ext.y1 + ext.y2) / 2 + (Math.random() - 0.5) * 100) : 200;
    await createNode(newNodeTitle.trim(), x, y);
    setNewNodeTitle('');
    setAddingNode(false);
  };

  const selectedNode    = currentTask?.nodes.find(n => n.id === selectedNodeId);
  const doneCount       = currentTask?.nodes.filter(n => n.status === 'done').length ?? 0;
  const totalCount      = currentTask?.nodes.length ?? 0;
  const progress        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const inProgressCount = currentTask?.nodes.filter(n => n.status === 'in-progress').length ?? 0;
  const blockingCount   = (() => {
    if (!currentTask) return 0;
    const statusMap = new Map(currentTask.nodes.map(n => [n.id, n.status]));
    const ids = new Set<string>();
    currentTask.edges.forEach(e => {
      if (statusMap.get(e.source_id) === 'pending' &&
          (statusMap.get(e.target_id) === 'pending' || statusMap.get(e.target_id) === 'in-progress')) {
        ids.add(e.source_id);
      }
    });
    return ids.size;
  })();

  // Derived styles
  const topbarBtn = (active = false): React.CSSProperties => ({
    padding: '4px 11px', borderRadius: 7, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600,
    background: active ? `${t.accent}30` : `${t.bgCard}`,
    color: active ? t.accentText : t.textMuted,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ width: '100vw', height: '100vh', background: t.bgMain, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: t.textPrimary }}>

      {/* ── Topbar ── */}
      <div style={{ height: 56, background: t.bgSurface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 }}>

        <button onClick={() => navigate('/pipeline')} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '5px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          ← Back
        </button>
        <div style={{ width: 1, height: 22, background: t.border }} />

        {/* Task name + progress */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
          {currentTask && <>
            <span style={{ fontWeight: 700, fontSize: 15, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>
              {currentTask.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 110, height: 4, background: t.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : t.accent, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: 11, color: t.textMuted, whiteSpace: 'nowrap' }}>{doneCount}/{totalCount} done</span>
            </div>
          </>}
        </div>

        {/* Display mode */}
        <div style={{ display: 'flex', background: t.bgCard, borderRadius: 8, padding: 3, gap: 2, border: `1px solid ${t.border}` }}>
          <button onClick={() => setDisplayMode('labeled')} style={topbarBtn(displayMode === 'labeled')} title="Show labels">
            ≡ Labels
          </button>
          <button onClick={() => setDisplayMode('dots')} style={topbarBtn(displayMode === 'dots')} title="Dots only">
            ⬤ Dots
          </button>
        </div>

        <div style={{ width: 1, height: 22, background: t.border }} />

        {/* Layout */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['dagre', 'breadthfirst', 'grid', 'free'] as const).map(l => (
            <button key={l} onClick={() => runLayout(l)} style={topbarBtn(layoutName === l)}>
              {l === 'dagre' ? 'Auto' : l === 'breadthfirst' ? 'Tree' : l === 'grid' ? 'Grid' : 'Free'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: t.border }} />

        {/* Light/dark toggle */}
        <button onClick={toggleColorMode} style={{ ...topbarBtn(), padding: '5px 10px', fontSize: 14 }} title="Toggle light/dark">
          {colorMode === 'dark' ? '☀' : '☽'}
        </button>

        <div style={{ width: 1, height: 22, background: t.border }} />

        {/* Add node */}
        {addingNode ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              value={newNodeTitle}
              onChange={e => setNewNodeTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddNode();
                if (e.key === 'Escape') { setAddingNode(false); setNewNodeTitle(''); }
              }}
              placeholder="Node title…"
              style={{ background: t.bgInput, border: `1px solid ${t.accent}`, color: t.textPrimary, padding: '5px 10px', borderRadius: 8, fontSize: 13, outline: 'none', width: 170 }}
            />
            <button onClick={handleAddNode} style={{ background: t.accent, border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Add</button>
            <button onClick={() => { setAddingNode(false); setNewNodeTitle(''); }} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        ) : (
          <button onClick={() => setAddingNode(true)} style={{ background: t.accent, border: 'none', color: '#fff', padding: '6px 15px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Node
          </button>
        )}
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas */}
        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          backgroundColor: t.bgMain,
          backgroundImage: t.bgCanvas,
          backgroundSize: '28px 28px',
        }}>

          {graphLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
              <div style={{ color: t.textMuted, fontSize: 14, background: t.overlayBg, padding: '10px 20px', borderRadius: 8 }}>Loading…</div>
            </div>
          )}

          {error && (
            <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 20, pointerEvents: 'none' }}>
              {error}
            </div>
          )}

          {!graphLoading && currentTask && currentTask.nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, pointerEvents: 'none' }}>
              <span style={{ fontSize: 56, opacity: 0.12, color: t.textSecondary }}>⬡</span>
              <span style={{ fontSize: 13, color: t.textMuted }}>No steps yet — click "+ Node" to add the first one</span>
            </div>
          )}

          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 18, left: 18, display: 'flex', gap: 14, background: t.overlayBg, borderRadius: 10, padding: '7px 14px', border: `1px solid ${t.border}`, backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
            {[
              { color: t.nodePendingBorder,    label: 'To Do'       },
              { color: t.nodeInProgressBorder, label: 'In Progress'  },
              { color: t.nodeDoneBorder,       label: 'Done'        },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color, boxShadow: `0 0 6px ${l.color}90` }} />
                <span style={{ fontSize: 11, color: t.textMuted }}>{l.label}</span>
              </div>
            ))}
            {displayMode === 'dots' && (
              <>
                <div style={{ width: 1, background: t.border, margin: '0 2px' }} />
                <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>Click a dot to see details</span>
              </>
            )}
          </div>

          {/* Status counter chip */}
          {(inProgressCount > 0 || blockingCount > 0) && (
            <div style={{
              position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
              background: t.overlayBg, border: `1px solid ${t.border}`,
              borderRadius: 24, padding: '6px 18px', display: 'flex', gap: 14, alignItems: 'center',
              backdropFilter: 'blur(8px)', zIndex: 10, fontSize: 12, fontWeight: 600,
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              {inProgressCount > 0 && (
                <span style={{ color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', boxShadow: '0 0 6px #3b82f680' }} />
                  {inProgressCount} en cours
                </span>
              )}
              {inProgressCount > 0 && blockingCount > 0 && <span style={{ color: t.textMuted }}>·</span>}
              {blockingCount > 0 && (
                <span style={{ color: '#fdba74', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block', boxShadow: '0 0 6px #f9731680' }} />
                  {blockingCount} bloquant{blockingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Selected node chip */}
          {panelOpen && selectedNode && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: t.overlayBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: t.textMuted, backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
              ◈ <span style={{ color: t.textPrimary, fontWeight: 600 }}>{selectedNode.title}</span>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {panelOpen && <NodePanel theme={t} />}
      </div>
    </div>
  );
}
