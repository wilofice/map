import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStoredToken } from '../store/authStore';
import { useAuthStore } from '../store/authStore';
import { themes } from '../theme/themes';
import { useMindMapStore } from '../store/mindMapStore';

interface Project { id: string; name: string; description: string; updated_at: string; }
interface DiagramCollection { id: string; name: string; updated_at: string; }
interface Diagram { id: string; title: string; type: string; diagram_collection_id: string; }
interface PipelineCollection { id: string; name: string; description: string; color: string; updated_at: string; }

interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  projects: Project[];
  diagramCollections: DiagramCollection[];
  diagrams: Diagram[];
  pipelineCollections: PipelineCollection[];
}

function ah(): Record<string, string> {
  const t = getStoredToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...ah(), ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  if (res.status === 204) return null;
  return res.json();
}

type AttachType = 'project' | 'diagram_collection' | 'pipeline_collection';

interface AttachOption { id: string; name: string; }

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const themeName = (user as any)?.theme ?? 'ibm';
  const t = themes[themeName as keyof typeof themes] ?? themes.ibm;

  const isDark = themeName !== 'light';
  const loadProject = useMindMapStore(s => s.loadProject);

  const [ws, setWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  // Attach picker state
  const [attachType, setAttachType] = useState<AttachType | null>(null);
  const [attachOptions, setAttachOptions] = useState<AttachOption[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/workspaces/${id}`)
      .then(data => { setWs(data); setEditForm({ name: data.name, description: data.description }); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!ws) return;
    const updated = await apiFetch(`/api/workspaces/${ws.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
    setWs(updated);
    setEditing(false);
  };

  const detach = async (type: AttachType, itemId: string) => {
    if (!ws) return;
    const updated = await apiFetch(`/api/workspaces/${ws.id}/detach`, { method: 'POST', body: JSON.stringify({ type, itemId }) });
    setWs(updated);
  };

  const openAttachPicker = async (type: AttachType) => {
    setAttachLoading(true);
    setAttachType(type);
    try {
      let data: AttachOption[] = [];
      if (type === 'project') {
        const all = await apiFetch('/api/db/projects');
        const linked = new Set(ws?.projects.map(p => p.id) ?? []);
        data = (all as Project[]).filter(p => !linked.has(p.id)).map(p => ({ id: p.id, name: p.name }));
      } else if (type === 'diagram_collection') {
        const all = await apiFetch('/api/diagram-collections');
        const linked = new Set(ws?.diagramCollections.map(d => d.id) ?? []);
        data = (all as DiagramCollection[]).filter(d => !linked.has(d.id)).map(d => ({ id: d.id, name: d.name }));
      } else {
        const all = await apiFetch('/api/pipeline/collections');
        const linked = new Set(ws?.pipelineCollections.map(p => p.id) ?? []);
        data = (all as PipelineCollection[]).filter(p => !linked.has(p.id)).map(p => ({ id: p.id, name: p.name }));
      }
      setAttachOptions(data);
    } catch { setAttachOptions([]); }
    setAttachLoading(false);
  };

  const attach = async (itemId: string) => {
    if (!ws || !attachType) return;
    const updated = await apiFetch(`/api/workspaces/${ws.id}/attach`, { method: 'POST', body: JSON.stringify({ type: attachType, itemId }) });
    setWs(updated);
    setAttachType(null);
  };

  const border = t.border;
  const bg     = t.shell;
  const card   = t.surface;
  const text   = t.textPrimary;
  const muted  = t.textMuted;
  const accent = ws?.color ?? '#6366f1';

  if (loading) return <div style={{ padding: 40, color: muted, fontFamily: 'inherit' }}>Chargement…</div>;
  if (error || !ws) return <div style={{ padding: 40, color: '#f87171', fontFamily: 'inherit' }}>⚠ {error ?? 'Not found'}</div>;

  const sectionStyle: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 20 };
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: 'inherit', padding: '32px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <button onClick={() => navigate('/workspaces')}
          style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 13, marginBottom: 20, padding: 0 }}>
          ← Workspaces
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>{ws.icon}</div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  style={{ fontSize: 22, fontWeight: 700, background: card, border: `1px solid ${border}`, borderRadius: 6, color: text, padding: '4px 10px', width: '100%', marginBottom: 8, boxSizing: 'border-box' }} />
                <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description…"
                  style={{ fontSize: 13, background: card, border: `1px solid ${border}`, borderRadius: 6, color: muted, padding: '4px 10px', width: '100%', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={save} style={{ padding: '6px 14px', background: accent, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Sauvegarder</button>
                  <button onClick={() => setEditing(false)} style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: text, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                </div>
              </>
            ) : (
              <>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, borderBottom: `3px solid ${accent}`, display: 'inline-block', paddingBottom: 2 }}>{ws.name}</h1>
                {ws.description && <p style={{ margin: '6px 0 0', fontSize: 13, color: muted }}>{ws.description}</p>}
                <button onClick={() => setEditing(true)} style={{ marginTop: 8, fontSize: 12, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✏ Modifier</button>
              </>
            )}
          </div>
        </div>

        {/* Section: Cartes mentales */}
        <Section
          title="Cartes mentales"
          emoji="🗺"
          items={ws.projects}
          onAdd={() => openAttachPicker('project')}
          onDetach={id => detach('project', id)}
          onOpen={id => { loadProject(id); navigate('/canvas'); }}
          border={border} card={card} text={text} muted={muted} accent={accent}
          emptyMsg="Aucune carte liée"
          style={sectionStyle} titleStyle={sectionTitle}
        />

        {/* Section: Diagrammes */}
        <DiagramsSection
          diagramCollections={ws.diagramCollections}
          diagrams={ws.diagrams}
          onAdd={() => openAttachPicker('diagram_collection')}
          onDetach={id => detach('diagram_collection', id)}
          onOpenDiagram={() => navigate('/diagrams')}
          border={border} text={text} muted={muted} accent={accent}
          style={sectionStyle} titleStyle={sectionTitle}
        />

        {/* Section: Pipelines */}
        <Section
          title="Pipelines"
          emoji="⚡"
          items={ws.pipelineCollections}
          onAdd={() => openAttachPicker('pipeline_collection')}
          onDetach={id => detach('pipeline_collection', id)}
          onOpen={() => navigate('/pipeline')}
          border={border} card={card} text={text} muted={muted} accent={accent}
          emptyMsg="Aucune collection de pipeline liée"
          style={sectionStyle} titleStyle={sectionTitle}
        />
      </div>

      {/* Attach picker modal */}
      {attachType && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setAttachType(null)}>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 24, width: 380, maxHeight: '60vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
              Attacher {attachType === 'project' ? 'une carte' : attachType === 'diagram_collection' ? 'une collection de diagrammes' : 'une collection de pipeline'}
            </h3>
            {attachLoading ? <p style={{ color: muted, fontSize: 13 }}>Chargement…</p> : attachOptions.length === 0 ? (
              <p style={{ color: muted, fontSize: 13 }}>Aucun élément disponible.</p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {attachOptions.map(opt => (
                  <div key={opt.id} onClick={() => attach(opt.id)}
                    style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: text,
                      border: `1px solid transparent`, marginBottom: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = border; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    {opt.name}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAttachType(null)} style={{ marginTop: 14, padding: '7px 0', background: 'transparent', border: `1px solid ${border}`, borderRadius: 7, color: muted, cursor: 'pointer', fontSize: 13 }}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DiagramsSection component ────────────────────────────────────────────────

const DIAGRAM_TYPE_ICON: Record<string, string> = {
  sequence: '↔', flowchart: '⬡', classDiagram: '⬜', gantt: '📅', pie: '🥧', default: '📐',
};

function DiagramsSection({ diagramCollections, diagrams, onAdd, onDetach, onOpenDiagram, border, text, muted, accent, style, titleStyle }: {
  diagramCollections: DiagramCollection[];
  diagrams: Diagram[];
  onAdd: () => void;
  onDetach: (id: string) => void;
  onOpenDiagram: () => void;
  border: string; text: string; muted: string; accent: string;
  style: React.CSSProperties; titleStyle: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={titleStyle}>📐 Diagrammes</span>
        <button onClick={onAdd}
          style={{ fontSize: 12, padding: '4px 10px', background: accent + '22', color: accent, border: `1px solid ${accent}44`, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          + Attacher
        </button>
      </div>
      {diagramCollections.length === 0 ? (
        <p style={{ fontSize: 13, color: muted, margin: 0 }}>Aucune collection de diagrammes liée</p>
      ) : (
        diagramCollections.map(coll => {
          const collDiagrams = diagrams.filter(d => d.diagram_collection_id === coll.id);
          return (
            <div key={coll.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{coll.name}</span>
                <button onClick={() => onDetach(coll.id)}
                  style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 14, opacity: 0.5, lineHeight: 1, padding: '1px 5px' }}
                  title="Détacher">×</button>
              </div>
              {collDiagrams.length === 0 ? (
                <p style={{ fontSize: 12, color: muted, margin: '0 0 4px 12px' }}>Aucun diagramme dans cette collection</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  {collDiagrams.map(d => (
                    <div key={d.id} onClick={onOpenDiagram}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                        border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
                    >
                      <span style={{ fontSize: 14 }}>{DIAGRAM_TYPE_ICON[d.type] ?? DIAGRAM_TYPE_ICON.default}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: text }}>{d.title}</span>
                      <span style={{ fontSize: 11, color: muted, background: accent + '18', padding: '2px 7px', borderRadius: 99 }}>{d.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Section component ────────────────────────────────────────────────────────

function Section({ title, emoji, items, onAdd, onDetach, onOpen, border, text, muted, accent, emptyMsg, style, titleStyle }: {
  title: string; emoji: string;
  items: { id: string; name: string }[];
  onAdd: () => void;
  onDetach: (id: string) => void;
  onOpen: (id: string) => void;
  border: string; card?: string; text: string; muted: string; accent: string;
  emptyMsg: string;
  style: React.CSSProperties; titleStyle: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={titleStyle}>{emoji} {title}</span>
        <button onClick={onAdd}
          style={{ fontSize: 12, padding: '4px 10px', background: accent + '22', color: accent, border: `1px solid ${accent}44`, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          + Attacher
        </button>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: muted, margin: 0 }}>{emptyMsg}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} onClick={() => onOpen(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
            >
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: text }}>{item.name}</span>
              <button onClick={e => { e.stopPropagation(); onDetach(item.id); }}
                style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16, opacity: 0.5, lineHeight: 1, padding: '1px 5px' }}
                title="Détacher">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
