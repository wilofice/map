import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getStoredToken } from '../store/authStore';
import { themes } from '../theme/themes';

interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  project_count: number;
  diagram_collection_count: number;
  pipeline_collection_count: number;
  updated_at: string;
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
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6','#f43f5e'];
const ICONS  = ['🗂','🏗','🚀','💡','🔬','🎯','⚙️','🌐','📦','🎨','📐','🔧'];

export default function WorkspacesPage() {
  const user = useAuthStore(s => s.user);
  const themeName = (user as any)?.theme ?? 'ibm';
  const t = themes[themeName as keyof typeof themes] ?? themes.ibm;
  const isDark = themeName === 'dark';
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0], icon: ICONS[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/workspaces')
      .then(setWorkspaces)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const w = await apiFetch('/api/workspaces', { method: 'POST', body: JSON.stringify(form) });
      setWorkspaces(prev => [w, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', color: COLORS[0], icon: ICONS[0] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const del = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce workspace ?')) return;
    await apiFetch(`/api/workspaces/${id}`, { method: 'DELETE' });
    setWorkspaces(prev => prev.filter(w => w.id !== id));
  };

  const border = t.border;
  const bg     = t.shell;
  const card   = t.surface;
  const text   = t.textPrimary;
  const muted  = t.textMuted;

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: 'inherit', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, maxWidth: 1100, margin: '0 auto 32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Workspaces</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: muted }}>Regroupe tes cartes, diagrammes et pipelines dans un même espace.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '9px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >+ Nouveau workspace</button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Nouveau workspace</h2>
            <label style={{ fontSize: 12, color: muted, display: 'block', marginBottom: 4 }}>Nom *</label>
            <input
              autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Mon workspace"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: `1px solid ${border}`, background: bg, color: text, fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: 12, color: muted, display: 'block', marginBottom: 4 }}>Description</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optionnel"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: `1px solid ${border}`, background: bg, color: text, fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: 12, color: muted, display: 'block', marginBottom: 8 }}>Icône</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  style={{ fontSize: 18, background: form.icon === ic ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') : 'transparent', border: `1px solid ${form.icon === ic ? border : 'transparent'}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                >{ic}</button>
              ))}
            </div>
            <label style={{ fontSize: 12, color: muted, display: 'block', marginBottom: 8 }}>Couleur</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 7, color: text, cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button onClick={create} disabled={saving || !form.name.trim()}
                style={{ padding: '8px 16px', background: form.color, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: saving ? 'wait' : 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}
              >{saving ? '…' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {loading && <p style={{ color: muted, textAlign: 'center', marginTop: 60 }}>Chargement…</p>}
        {error && <p style={{ color: '#f87171', textAlign: 'center', marginTop: 40 }}>⚠ {error}</p>}
        {!loading && !error && workspaces.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 80, color: muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗂</div>
            <p style={{ fontSize: 15 }}>Aucun workspace — crée le premier !</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {workspaces.map(w => (
            <div key={w.id} onClick={() => navigate(`/workspaces/${w.id}`)}
              style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, cursor: 'pointer', position: 'relative',
                borderTop: `3px solid ${w.color}`, transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.2)`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <button onClick={e => del(w.id, e)}
                style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16, opacity: 0.5, lineHeight: 1, padding: '2px 5px' }}
                title="Supprimer"
              >×</button>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{w.icon}</div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: text }}>{w.name}</h3>
              {w.description && <p style={{ margin: '0 0 14px', fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.description}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: w.description ? 0 : 14 }}>
                <Chip label={`${w.project_count} carte${w.project_count !== 1 ? 's' : ''}`} color={w.color} />
                <Chip label={`${w.diagram_collection_count} diag.`} color={w.color} />
                <Chip label={`${w.pipeline_collection_count} pipe.`} color={w.color} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: color + '22', color: color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  );
}
