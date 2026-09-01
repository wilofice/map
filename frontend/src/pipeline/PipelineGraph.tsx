import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { usePipelineStore } from './pipelineStore';
import NodePanel from './NodePanel';

let dagreRegistered = false;
if (!dagreRegistered) {
  cytoscape.use(dagre as cytoscape.Ext);
  dagreRegistered = true;
}

const TYPE_SHAPE: Record<string, string> = {
  step: 'roundrectangle', decision: 'diamond', milestone: 'star', review: 'hexagon',
};

function buildCyStyle() {
  return [
    {
      selector: 'node',
      style: {
        'width': 210, 'height': 84,
        'shape': 'roundrectangle',
        'background-color': '#1e2b42',
        'border-color': '#3a4f72', 'border-width': 2,
        'label': 'data(label)',
        'text-wrap': 'wrap', 'text-max-width': '180px',
        'text-valign': 'center', 'text-halign': 'center',
        'color': '#94a3b8', 'font-size': '12px',
        'font-family': 'ui-sans-serif, system-ui, sans-serif',
      },
    },
    {
      selector: 'node[status = "in-progress"]',
      style: {
        'background-color': '#152d58', 'border-color': '#3b82f6', 'border-width': 2,
        'color': '#93c5fd',
        'shadow-blur': 20, 'shadow-color': '#3b82f6', 'shadow-opacity': 0.55,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      },
    },
    {
      selector: 'node[status = "done"]',
      style: {
        'background-color': '#0f3528', 'border-color': '#10b981', 'border-width': 2,
        'color': '#6ee7b7',
        'shadow-blur': 20, 'shadow-color': '#10b981', 'shadow-opacity': 0.55,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#818cf8', 'border-width': 3,
        'shadow-blur': 24, 'shadow-color': '#6366f1', 'shadow-opacity': 0.8,
        'shadow-offset-x': 0, 'shadow-offset-y': 0,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2, 'line-color': '#3a4f72',
        'target-arrow-color': '#3a4f72', 'target-arrow-shape': 'triangle',
        'curve-style': 'bezier', 'arrow-scale': 1.2, 'opacity': 0.8,
      },
    },
    {
      selector: 'edge[?fromDone]',
      style: { 'line-color': '#10b981', 'target-arrow-color': '#10b981', 'opacity': 0.5 },
    },
  ] as cytoscape.StylesheetStyle[];
}

export default function PipelineGraph() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // Read from store
  const { currentTask, selectedNodeId, panelOpen, graphLoading, error, loadTask, createNode } = usePipelineStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutAppliedRef = useRef(false);
  const [addingNode, setAddingNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [layoutName, setLayoutName] = useState<'dagre' | 'breadthfirst' | 'grid' | 'free'>('dagre');

  // ── EFFECT 1: load task data ──────────────────────────────────────────────
  useEffect(() => {
    if (taskId) {
      layoutAppliedRef.current = false;
      loadTask(taskId);
    }
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── EFFECT 2: create cy once (container is in DOM, empty deps) ───────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements: [],
      style: buildCyStyle(),
      wheelSensitivity: 0.3,
      minZoom: 0.2,
      maxZoom: 3,
    });
    cyRef.current = cy;

    // Use getState() so handlers always read live state — no stale closure
    cy.on('tap', 'node', evt => {
      const id = evt.target.id();
      usePipelineStore.getState().setSelectedNodeId(id);
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

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── EFFECT 3: sync data whenever currentTask changes ──────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !currentTask) return;

    cy.batch(() => {
      // Remove stale nodes
      cy.nodes().forEach(n => {
        if (!currentTask.nodes.find(nd => nd.id === n.id())) cy.remove(n);
      });
      // Remove stale edges
      cy.edges().forEach(e => {
        if (!currentTask.edges.find(ed => ed.id === e.id())) cy.remove(e);
      });

      // Add / update nodes
      currentTask.nodes.forEach(n => {
        const shp = (TYPE_SHAPE[n.type] || 'roundrectangle') as cytoscape.Css.NodeShape;
        const existing = cy.getElementById(n.id);
        if (existing.length === 0) {
          cy.add({
            group: 'nodes',
            data: { id: n.id, label: n.title || 'Untitled', status: n.status },
            style: { shape: shp },
            position: n.position_x || n.position_y
              ? { x: n.position_x, y: n.position_y }
              : { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
          });
        } else {
          existing.data('label', n.title || 'Untitled');
          existing.data('status', n.status);
          existing.style('shape', shp);
        }
      });

      // Add missing edges
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

    // Apply layout on first load if no saved positions
    if (!layoutAppliedRef.current && currentTask.nodes.length > 0) {
      const hasSaved = currentTask.nodes.some(n => n.position_x || n.position_y);
      if (!hasSaved) {
        cy.layout({ name: 'dagre', rankDir: 'LR', nodeSep: 50, rankSep: 130 } as cytoscape.LayoutOptions).run();
      }
      layoutAppliedRef.current = true;
    }
  }, [currentTask]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── EFFECT 4: sync selection highlight ───────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedNodeId) cy.getElementById(selectedNodeId).select();
  }, [selectedNodeId]);

  // ── Layout switcher ───────────────────────────────────────────────────────
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

  // ── Add node ──────────────────────────────────────────────────────────────
  const handleAddNode = async () => {
    if (!newNodeTitle.trim()) return;
    const cy = cyRef.current;
    const ext = cy ? cy.extent() : null;
    const x = ext ? Math.round((ext.x1 + ext.x2) / 2 + (Math.random() - 0.5) * 200) : 200;
    const y = ext ? Math.round((ext.y1 + ext.y2) / 2 + (Math.random() - 0.5) * 100) : 200;
    await createNode(newNodeTitle.trim(), x, y);
    setNewNodeTitle('');
    setAddingNode(false);
  };

  const selectedNode = currentTask?.nodes.find(n => n.id === selectedNodeId);
  const doneCount  = currentTask?.nodes.filter(n => n.status === 'done').length ?? 0;
  const totalCount = currentTask?.nodes.length ?? 0;
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#131e32',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#e2e8f0',
    }}>
      {/* ── Topbar ── */}
      <div style={{
        height: 56, background: '#1a2540', borderBottom: '1px solid #2c3d5c',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0,
      }}>
        <button onClick={() => navigate('/pipeline')} style={btnBack}>← Back</button>
        <div style={divider} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {currentTask && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#c7d2fe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                {currentTask.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 120, height: 4, background: '#2c3d5c', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#10b981' : '#6366f1', borderRadius: 2, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{doneCount}/{totalCount} done</span>
              </div>
            </div>
          )}
        </div>

        {/* Layout buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['dagre', 'breadthfirst', 'grid', 'free'] as const).map(l => (
            <button key={l} onClick={() => runLayout(l)} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: layoutName === l ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
              color: layoutName === l ? '#818cf8' : '#64748b',
            }}>
              {l === 'dagre' ? 'Auto' : l === 'breadthfirst' ? 'Tree' : l === 'grid' ? 'Grid' : 'Free'}
            </button>
          ))}
        </div>

        <div style={divider} />

        {/* Add node input or button */}
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
              style={{ background: '#1e2d48', border: '1px solid #6366f1', color: '#e2e8f0', padding: '5px 10px', borderRadius: 8, fontSize: 13, outline: 'none', width: 180 }}
            />
            <button onClick={handleAddNode} style={btnPrimary}>Add</button>
            <button onClick={() => { setAddingNode(false); setNewNodeTitle(''); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        ) : (
          <button onClick={() => setAddingNode(true)} style={btnPrimary}>+ Node</button>
        )}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas wrapper */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Loading overlay */}
          {graphLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
              <div style={{ color: '#64748b', fontSize: 14, background: 'rgba(26,37,64,0.85)', padding: '10px 20px', borderRadius: 8 }}>Loading…</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 20, pointerEvents: 'none' }}>
              {error}
            </div>
          )}

          {/* Empty state */}
          {!graphLoading && currentTask && currentTask.nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, pointerEvents: 'none' }}>
              <span style={{ fontSize: 56, opacity: 0.1 }}>⬡</span>
              <span style={{ fontSize: 13, color: '#3a4f72' }}>No steps yet — click "+ Node" to add the first one</span>
            </div>
          )}

          {/* Cytoscape container — MUST fill parent */}
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 14, background: 'rgba(26,37,64,0.92)', borderRadius: 10, padding: '8px 16px', border: '1px solid #2c3d5c', backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
            {[{ color: '#3a4f72', label: 'To Do' }, { color: '#3b82f6', label: 'In Progress' }, { color: '#10b981', label: 'Done' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color, boxShadow: `0 0 6px ${l.color}90` }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Selected node chip */}
          {panelOpen && selectedNode && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(26,37,64,0.92)', border: '1px solid #2c3d5c', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#64748b', backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
              ◈ <span style={{ color: '#c7d2fe', fontWeight: 600 }}>{selectedNode.title}</span>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {panelOpen && <NodePanel />}
      </div>
    </div>
  );
}

const btnBack: React.CSSProperties = {
  background: 'transparent', border: '1px solid #2c3d5c', color: '#64748b',
  padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
};
const btnPrimary: React.CSSProperties = {
  background: '#6366f1', border: 'none', color: '#fff',
  padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const divider: React.CSSProperties = { width: 1, height: 24, background: '#2c3d5c' };
