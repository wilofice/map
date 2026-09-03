import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { useMindMapStore } from '../store/mindMapStore';
import { themes } from '../theme/themes';

const API = '/api/diagrams';

type DiagramType = 'flowchart' | 'sequence' | 'stateDiagram' | 'classDiagram' | 'erDiagram' | 'gantt' | 'mindmap';

interface DiagramMeta {
  id: string;
  title: string;
  description: string;
  type: DiagramType;
  collection_id: string | null;
  updated_at: string;
}
interface Diagram extends DiagramMeta {
  code: string;
}

const TYPE_LABELS: Record<DiagramType, string> = {
  flowchart: 'Flowchart',
  sequence: 'Séquence',
  stateDiagram: 'États',
  classDiagram: 'Classes',
  erDiagram: 'ER',
  gantt: 'Gantt',
  mindmap: 'Mindmap',
};

const STARTER: Record<DiagramType, string> = {
  flowchart: 'flowchart LR\n  A[Début] --> B{Décision}\n  B -- Oui --> C[Action]\n  B -- Non --> D[Fin]',
  sequence: 'sequenceDiagram\n  participant A\n  participant B\n  A->>B: Message\n  B-->>A: Réponse',
  stateDiagram: 'stateDiagram-v2\n  [*] --> Actif\n  Actif --> Inactif\n  Inactif --> [*]',
  classDiagram: 'classDiagram\n  class Animal {\n    +String nom\n    +manger()\n  }',
  erDiagram: 'erDiagram\n  USER ||--o{ ORDER : "passe"\n  ORDER ||--|{ LINE-ITEM : "contient"',
  gantt: 'gantt\n  title Planning\n  dateFormat YYYY-MM-DD\n  section Phase 1\n    Tâche A : 2026-01-01, 7d',
  mindmap: 'mindmap\n  root((Idée centrale))\n    Thème A\n      Sous-thème 1\n    Thème B',
};

let mermaidInited = false;
function initMermaid(dark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });
  mermaidInited = true;
}

export default function DiagramStudio() {
  const { theme } = useMindMapStore();
  const t = themes[theme];
  const isDark = theme !== 'light';

  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([]);
  const [selected, setSelected] = useState<Diagram | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Pan/zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderIdRef = useRef(0);

  // Init mermaid when theme changes
  useEffect(() => {
    initMermaid(isDark);
  }, [isDark]);

  // Load list
  const loadList = useCallback(async () => {
    const res = await fetch(API);
    if (res.ok) setDiagrams(await res.json());
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // Render mermaid SVG
  const renderSvg = useCallback(async (src: string) => {
    if (!svgContainerRef.current || !src.trim()) {
      if (svgContainerRef.current) svgContainerRef.current.innerHTML = '';
      setRenderError(null);
      return;
    }
    if (!mermaidInited) initMermaid(isDark);
    const id = `mmd-${++renderIdRef.current}`;
    try {
      const { svg } = await mermaid.render(id, src);
      if (svgContainerRef.current) {
        svgContainerRef.current.innerHTML = svg;
        // Make the SVG fill the container naturally
        const svgEl = svgContainerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = 'auto';
          svgEl.style.maxWidth = '100%';
        }
      }
      setRenderError(null);
    } catch (e: unknown) {
      setRenderError(e instanceof Error ? e.message : String(e));
      // Clean up leftover error element mermaid may have injected into DOM
      document.getElementById(id)?.remove();
    }
  }, [isDark]);

  // Re-render when code changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderSvg(code), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code, renderSvg]);

  // Auto-save (debounced 1.5s)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selected) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (!selected) return;
      setSaving(true);
      await fetch(`${API}/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, title }),
      });
      setSaving(false);
      setDiagrams(prev => prev.map(d => d.id === selected.id ? { ...d, title } : d));
    }, 1500);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, title]);

  const openDiagram = async (id: string) => {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) return;
    const d: Diagram = await res.json();
    setSelected(d);
    setCode(d.code);
    setTitle(d.title);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const createNew = async (type: DiagramType = 'flowchart') => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouveau diagramme', code: STARTER[type], type }),
    });
    if (!res.ok) return;
    const d: Diagram = await res.json();
    await loadList();
    await openDiagram(d.id);
  };

  const deleteDiagram = async (id: string) => {
    if (!confirm('Supprimer ce diagramme ?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (selected?.id === id) { setSelected(null); setCode(''); setTitle(''); }
    setDiagrams(prev => prev.filter(d => d.id !== id));
  };

  // Export SVG
  const exportSvg = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title || 'diagram'}.svg`; a.click();
    URL.revokeObjectURL(url);
  };

  // Export PNG
  const exportPng = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * 2;
      canvas.height = img.naturalHeight * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${title || 'diagram'}.png`;
      a.click();
    };
    img.src = url;
  };

  // Pan/zoom handlers
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(0.1, z * (e.deltaY < 0 ? 1.12 : 0.89))));
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my });
  };
  const onMouseUp = () => { dragging.current = false; };

  const filtered = diagrams.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const border = t.border;
  const bg = t.surface;
  const bgCard = t.card;
  const text = t.textPrimary;
  const muted = t.textMuted;
  const accent = t.bgAccent;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: t.shell, color: text, fontFamily: 'inherit' }}>

      {/* Sidebar */}
      <aside style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}`, background: bg }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => createNew('flowchart')}
              style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              + Nouveau
            </button>
          </div>
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '5px 8px', fontSize: 12, background: t.card, border: `1px solid ${border}`, borderRadius: 5, color: text, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ padding: 16, fontSize: 12, color: muted, textAlign: 'center' }}>Aucun diagramme</p>
          )}
          {filtered.map(d => (
            <div
              key={d.id}
              onClick={() => openDiagram(d.id)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: selected?.id === d.id ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : 'transparent',
                borderLeft: selected?.id === d.id ? `3px solid ${accent}` : '3px solid transparent',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{TYPE_LABELS[d.type] ?? d.type}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteDiagram(d.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 14, padding: 2, flexShrink: 0, lineHeight: 1 }}
                title="Supprimer"
              >×</button>
            </div>
          ))}
        </div>

        {/* Type selector for new diagram */}
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${border}` }}>
          <p style={{ fontSize: 10, color: muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Créer par type</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(Object.keys(TYPE_LABELS) as DiagramType[]).map(type => (
              <button
                key={type}
                onClick={() => createNew(type)}
                style={{ fontSize: 10, padding: '3px 6px', background: bgCard, border: `1px solid ${border}`, borderRadius: 4, cursor: 'pointer', color: muted }}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 44, borderBottom: `1px solid ${border}`, background: bg, flexShrink: 0 }}>
          {selected ? (
            <>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ fontSize: 14, fontWeight: 600, background: 'transparent', border: 'none', color: text, outline: 'none', flex: 1, minWidth: 0 }}
              />
              <span style={{ fontSize: 11, color: muted }}>{saving ? 'Sauvegarde…' : 'Sauvegardé'}</span>
              <div style={{ width: 1, height: 20, background: border }} />
              <button onClick={exportSvg} style={btnStyle(border, muted)} title="Exporter SVG">SVG</button>
              <button onClick={exportPng} style={btnStyle(border, muted)} title="Exporter PNG">PNG</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={btnStyle(border, muted)} title="Réinitialiser la vue">⊙</button>
              <div style={{ width: 1, height: 20, background: border }} />
              <span style={{ fontSize: 11, color: muted }}>{Math.round(zoom * 100)}%</span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: muted }}>Sélectionne un diagramme ou crée-en un nouveau</span>
          )}
        </header>

        {/* Split: editor + preview */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Editor pane */}
            <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}`, background: bgCard }}>
              <div style={{ padding: '6px 10px', borderBottom: `1px solid ${border}`, fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Code Mermaid
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1, padding: 12, fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                  fontSize: 12, lineHeight: 1.6, resize: 'none', border: 'none', outline: 'none',
                  background: 'transparent', color: text, overflowY: 'auto',
                }}
              />
              {renderError && (
                <div style={{ padding: '8px 12px', fontSize: 11, color: '#ef4444', borderTop: `1px solid ${border}`, background: 'rgba(239,68,68,0.07)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto' }}>
                  ⚠ {renderError}
                </div>
              )}
            </div>

            {/* Preview pane */}
            <div
              ref={canvasRef}
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: dragging.current ? 'grabbing' : 'grab', background: isDark ? '#111318' : '#ffffff' }}
            >
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: isDark
                    ? 'radial-gradient(circle, rgba(148,163,184,0.13) 1.5px, transparent 1.5px)'
                    : 'radial-gradient(circle, rgba(156,163,175,0.5) 1.5px, transparent 1.5px)',
                  backgroundSize: '28px 28px',
                }}
              />
              <div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  userSelect: 'none',
                }}
              >
                <div
                  ref={svgContainerRef}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxWidth: '90%',
                    padding: 20,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 48, opacity: 0.15 }}>⬡</div>
            <p style={{ fontSize: 13, color: muted }}>Crée un diagramme depuis la barre latérale pour commencer.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(border: string, color: string): React.CSSProperties {
  return {
    fontSize: 11, padding: '3px 8px', background: 'transparent',
    border: `1px solid ${border}`, borderRadius: 4, cursor: 'pointer', color,
  };
}
