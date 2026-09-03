import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { useMindMapStore } from '../store/mindMapStore';
import { themes } from '../theme/themes';

const API = '/api/diagrams';
const COL_API = '/api/diagram-collections';

type DiagramType = 'flowchart' | 'sequence' | 'stateDiagram' | 'classDiagram' | 'erDiagram' | 'gantt' | 'mindmap';

interface DiagramCollection {
  id: string;
  name: string;
  diagram_count: number;
}
interface DiagramMeta {
  id: string;
  title: string;
  description: string;
  type: DiagramType;
  diagram_collection_id: string | null;
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
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'loose', fontFamily: 'inherit' });
  mermaidInited = true;
}

// ─── Collection item ───────────────────────────────────────────────────────────
function CollectionItem({
  col, selected, onSelect, onRename, onDelete, border, text, muted, accent, isDark,
}: {
  col: DiagramCollection; selected: boolean;
  onSelect: () => void; onRename: (name: string) => void; onDelete: () => void;
  border: string; text: string; muted: string; accent: string; isDark: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(col.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== col.name) onRename(trimmed);
    else setDraft(col.name);
  };

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  return (
    <div
      onClick={() => !editing && onSelect()}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
        cursor: editing ? 'default' : 'pointer',
        background: selected ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : 'transparent',
        borderLeft: selected ? `3px solid ${accent}` : '3px solid transparent',
      }}
    >
      <span style={{ fontSize: 12, marginRight: 2, opacity: 0.6 }}>📁</span>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(col.name); } }}
          style={{ flex: 1, fontSize: 12, background: 'transparent', border: `1px solid ${border}`, borderRadius: 3, color: text, outline: 'none', padding: '1px 4px' }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 12, fontWeight: selected ? 600 : 400, color: selected ? text : muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {col.name}
        </span>
      )}
      <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{col.diagram_count}</span>
      {!editing && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setEditing(true); setDraft(col.name); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 11, padding: '1px 3px', lineHeight: 1, opacity: 0.7 }}
            title="Renommer"
          >✎</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 13, padding: '1px 3px', lineHeight: 1, opacity: 0.7 }}
            title="Supprimer"
          >×</button>
        </>
      )}
    </div>
  );
}

// ─── Move dropdown ─────────────────────────────────────────────────────────────
function MoveDropdown({
  collections, currentId, onMove, onClose, border, bg, text, muted,
}: {
  collections: DiagramCollection[]; currentId: string | null;
  onMove: (id: string | null) => void; onClose: () => void;
  border: string; bg: string; text: string; muted: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: bg, border: `1px solid ${border}`, borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', minWidth: 160, padding: '4px 0' }}>
      <div
        onClick={() => { onMove(null); onClose(); }}
        style={{ padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: currentId === null ? text : muted, fontWeight: currentId === null ? 600 : 400 }}
      >Sans projet</div>
      {collections.map(c => (
        <div
          key={c.id}
          onClick={() => { onMove(c.id); onClose(); }}
          style={{ padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: currentId === c.id ? text : muted, fontWeight: currentId === c.id ? 600 : 400 }}
        >{c.name}</div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function DiagramStudio() {
  const { theme } = useMindMapStore();
  const t = themes[theme];
  const isDark = theme !== 'light';

  const [collections, setCollections] = useState<DiagramCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null | 'all'>('all');
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([]);
  const [selected, setSelected] = useState<Diagram | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [movingDiagramId, setMovingDiagramId] = useState<string | null>(null);

  // Pan/zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderIdRef = useRef(0);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { initMermaid(isDark); }, [isDark]);

  // Load collections
  const loadCollections = useCallback(async () => {
    const res = await fetch(COL_API);
    if (res.ok) setCollections(await res.json());
  }, []);

  // Load diagrams (filtered by selected collection)
  const loadDiagrams = useCallback(async () => {
    let url = API;
    if (selectedCollectionId !== 'all') {
      url += selectedCollectionId === null
        ? '?diagram_collection_id=none'
        : `?diagram_collection_id=${selectedCollectionId}`;
    }
    const res = await fetch(url);
    if (res.ok) setDiagrams(await res.json());
  }, [selectedCollectionId]);

  useEffect(() => { loadCollections(); }, [loadCollections]);
  useEffect(() => { loadDiagrams(); }, [loadDiagrams]);

  // Render SVG
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
        const svgEl = svgContainerRef.current.querySelector('svg');
        if (svgEl) { svgEl.style.width = '100%'; svgEl.style.height = 'auto'; svgEl.style.maxWidth = '100%'; }
      }
      setRenderError(null);
    } catch (e: unknown) {
      setRenderError(e instanceof Error ? e.message : String(e));
      document.getElementById(id)?.remove();
    }
  }, [isDark]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderSvg(code), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code, renderSvg]);

  // Auto-save
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
    setSelected(d); setCode(d.code); setTitle(d.title);
    setZoom(1); setPan({ x: 0, y: 0 });
  };

  const createNew = async (type: DiagramType = 'flowchart') => {
    const colId = selectedCollectionId === 'all' ? null : selectedCollectionId;
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouveau diagramme', code: STARTER[type], type, diagram_collection_id: colId }),
    });
    if (!res.ok) return;
    const d: Diagram = await res.json();
    await loadCollections();
    await loadDiagrams();
    await openDiagram(d.id);
  };

  const deleteDiagram = async (id: string) => {
    if (!confirm('Supprimer ce diagramme ?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (selected?.id === id) { setSelected(null); setCode(''); setTitle(''); }
    await loadCollections();
    setDiagrams(prev => prev.filter(d => d.id !== id));
  };

  const moveDiagram = async (diagramId: string, targetCollectionId: string | null) => {
    await fetch(`${API}/${diagramId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagram_collection_id: targetCollectionId ?? '' }),
    });
    await loadCollections();
    await loadDiagrams();
    if (selected?.id === diagramId) setSelected(prev => prev ? { ...prev, diagram_collection_id: targetCollectionId } : null);
  };

  // Collection CRUD
  const createCollection = async () => {
    const name = prompt('Nom du projet :');
    if (!name?.trim()) return;
    const res = await fetch(COL_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
    if (!res.ok) return;
    const col: DiagramCollection = await res.json();
    await loadCollections();
    setSelectedCollectionId(col.id);
  };

  const renameCollection = async (id: string, name: string) => {
    await fetch(`${COL_API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    setCollections(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const deleteCollection = async (id: string) => {
    const col = collections.find(c => c.id === id);
    if (!confirm(`Supprimer le projet "${col?.name}" ?\nLes diagrammes seront conservés sans projet.`)) return;
    await fetch(`${COL_API}/${id}`, { method: 'DELETE' });
    if (selectedCollectionId === id) setSelectedCollectionId('all');
    await loadCollections();
    await loadDiagrams();
  };

  // Export
  const exportSvg = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${title || 'diagram'}.svg`; a.click(); URL.revokeObjectURL(url);
  };
  const exportPng = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth * 2; canvas.height = img.naturalHeight * 2;
      const ctx = canvas.getContext('2d')!; ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `${title || 'diagram'}.png`; a.click();
    };
    img.src = url;
  };

  // Pan/zoom
  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.min(5, Math.max(0.1, z * (e.deltaY < 0 ? 1.12 : 0.89)))); };
  const onMouseDown = (e: React.MouseEvent) => { if (e.button !== 0) return; dragging.current = true; dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }; };
  const onMouseMove = (e: React.MouseEvent) => { if (!dragging.current) return; setPan({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my }); };
  const onMouseUp = () => { dragging.current = false; };

  const filtered = diagrams.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const border = t.border;
  const bg = t.surface;
  const bgCard = t.card;
  const text = t.textPrimary;
  const muted = t.textMuted;
  const accent = t.bgAccent;

  const selectedColName = selectedCollectionId === 'all'
    ? 'Tous les diagrammes'
    : collections.find(c => c.id === selectedCollectionId)?.name ?? 'Sans projet';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: t.shell, color: text, fontFamily: 'inherit' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}`, background: bg }}>

        {/* Collections section */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 6px', borderBottom: `1px solid ${border}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projets</span>
            <button
              onClick={createCollection}
              style={{ fontSize: 11, padding: '2px 7px', background: accent, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
              title="Nouveau projet"
            >+ Projet</button>
          </div>

          {/* All */}
          <div
            onClick={() => setSelectedCollectionId('all')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', cursor: 'pointer',
              background: selectedCollectionId === 'all' ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : 'transparent',
              borderLeft: selectedCollectionId === 'all' ? `3px solid ${accent}` : '3px solid transparent',
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.5 }}>⊞</span>
            <span style={{ fontSize: 12, fontWeight: selectedCollectionId === 'all' ? 600 : 400, color: selectedCollectionId === 'all' ? text : muted, flex: 1 }}>Tous les diagrammes</span>
            <span style={{ fontSize: 10, color: muted }}>{diagrams.length > 0 || selectedCollectionId !== 'all' ? '' : ''}</span>
          </div>

          {/* Collection list */}
          {collections.map(col => (
            <CollectionItem
              key={col.id}
              col={col}
              selected={selectedCollectionId === col.id}
              onSelect={() => setSelectedCollectionId(col.id)}
              onRename={name => renameCollection(col.id, name)}
              onDelete={() => deleteCollection(col.id)}
              border={border} text={text} muted={muted} accent={accent} isDark={isDark}
            />
          ))}
        </div>

        {/* Diagrams section */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderTop: `1px solid ${border}` }}>
          <div style={{ padding: '8px 10px 6px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedColName}</span>
              <button
                onClick={() => createNew('flowchart')}
                style={{ fontSize: 11, padding: '3px 8px', background: accent, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >+ Nouveau</button>
            </div>
            <input
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', fontSize: 12, background: bgCard, border: `1px solid ${border}`, borderRadius: 5, color: text, outline: 'none', boxSizing: 'border-box' }}
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
                  padding: '7px 10px', cursor: 'pointer', position: 'relative',
                  background: selected?.id === d.id ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  borderLeft: selected?.id === d.id ? `3px solid ${accent}` : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                  <div style={{ fontSize: 10, color: muted, marginTop: 1 }}>{TYPE_LABELS[d.type] ?? d.type}</div>
                </div>

                {/* Move button */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMovingDiagramId(movingDiagramId === d.id ? null : d.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 11, padding: '1px 3px', lineHeight: 1 }}
                    title="Déplacer vers…"
                  >↗</button>
                  {movingDiagramId === d.id && (
                    <MoveDropdown
                      collections={collections}
                      currentId={d.diagram_collection_id}
                      onMove={id => moveDiagram(d.id, id)}
                      onClose={() => setMovingDiagramId(null)}
                      border={border} bg={bg} text={text} muted={muted}
                    />
                  )}
                </div>

                <button
                  onClick={e => { e.stopPropagation(); deleteDiagram(d.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 14, padding: '1px 3px', flexShrink: 0, lineHeight: 1 }}
                  title="Supprimer"
                >×</button>
              </div>
            ))}
          </div>

          {/* Type picker */}
          <div style={{ padding: '6px 10px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Créer par type</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(Object.keys(TYPE_LABELS) as DiagramType[]).map(type => (
                <button key={type} onClick={() => createNew(type)}
                  style={{ fontSize: 10, padding: '3px 6px', background: bgCard, border: `1px solid ${border}`, borderRadius: 4, cursor: 'pointer', color: muted }}>
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
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
              <button onClick={exportSvg} style={btnStyle(border, muted)}>SVG</button>
              <button onClick={exportPng} style={btnStyle(border, muted)}>PNG</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={btnStyle(border, muted)} title="Réinitialiser la vue">⊙</button>
              <div style={{ width: 1, height: 20, background: border }} />
              <button
                onClick={() => setShowEditor(v => !v)}
                style={{ ...btnStyle(border, showEditor ? accent : muted), fontWeight: showEditor ? 600 : 400 }}
                title={showEditor ? "Masquer le code" : "Afficher le code"}
              >{showEditor ? '‹ Code' : '› Code'}</button>
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
            <div style={{ width: showEditor ? 340 : 0, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: showEditor ? `1px solid ${border}` : 'none', background: bgCard, overflow: 'hidden', transition: 'width 0.2s ease' }}>
              <div style={{ padding: '6px 10px', borderBottom: `1px solid ${border}`, fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Code Mermaid</div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                style={{ flex: 1, padding: 12, fontFamily: 'Menlo, Monaco, "Courier New", monospace', fontSize: 12, lineHeight: 1.6, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: text, overflowY: 'auto' }}
              />
              {renderError && (
                <div style={{ padding: '8px 12px', fontSize: 11, color: '#ef4444', borderTop: `1px solid ${border}`, background: 'rgba(239,68,68,0.07)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto' }}>
                  ⚠ {renderError}
                </div>
              )}
            </div>

            {/* Preview pane */}
            <div
              onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: dragging.current ? 'grabbing' : 'grab', background: isDark ? '#111318' : '#ffffff' }}
            >
              <div style={{ position: 'absolute', inset: 0, backgroundImage: isDark ? 'radial-gradient(circle, rgba(148,163,184,0.13) 1.5px, transparent 1.5px)' : 'radial-gradient(circle, rgba(156,163,175,0.5) 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
                <div ref={svgContainerRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', maxWidth: '90%', padding: 20 }} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 48, opacity: 0.15 }}>⬡</div>
            <p style={{ fontSize: 13, color: muted }}>Sélectionne un diagramme ou crée-en un nouveau.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(border: string, color: string): React.CSSProperties {
  return { fontSize: 11, padding: '3px 8px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 4, cursor: 'pointer', color };
}
