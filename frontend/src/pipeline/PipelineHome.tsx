import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelineStore } from './pipelineStore';
import type { PipelineTask } from './pipelineApi';
import { type PipelineColorMode, type PipelineTheme, getTheme, loadColorMode, saveColorMode } from './pipelineTheme';

const TASK_TYPES = ['general', 'code', 'video', 'design', 'research', 'review'] as const;
const TYPE_ICON: Record<string, string> = { general: '◈', code: '⌥', video: '▶', design: '◇', research: '⊙', review: '⊡' };
const TYPE_COLOR: Record<string, string> = { general: '#6366f1', code: '#06b6d4', video: '#f59e0b', design: '#ec4899', research: '#8b5cf6', review: '#10b981' };
const STATUS_CFG = {
  pending:      { label: 'Pending',     color: '#475569', bg: 'rgba(71,85,105,0.15)' },
  'in-progress':{ label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  done:         { label: 'Done',        color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};
const PRIORITY_DOT: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

export default function PipelineHome() {
  const navigate = useNavigate();
  const { collections, tasks, loading, selectedCollectionId, setSelectedCollectionId, loadTasks, createTask, deleteTask, createCollection } = usePipelineStore();

  const [colorMode, setColorMode] = useState<PipelineColorMode>(loadColorMode);
  const t = getTheme(colorMode);
  const toggleColorMode = () => { const next: PipelineColorMode = colorMode === 'dark' ? 'light' : 'dark'; setColorMode(next); saveColorMode(next); };

  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewColl, setShowNewColl] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ name: '', description: '', type: 'general', priority: 'medium', collection_id: '' });
  const [newCollForm, setNewCollForm] = useState({ name: '', color: '#6366f1' });

  useEffect(() => { loadTasks(selectedCollectionId ?? undefined); }, [selectedCollectionId, loadTasks]);

  const filteredTasks = selectedCollectionId
    ? tasks.filter(t => t.collection_id === selectedCollectionId)
    : tasks;

  const handleCreateTask = async () => {
    if (!newTaskForm.name.trim()) return;
    const task = await createTask({ ...newTaskForm, collection_id: newTaskForm.collection_id || null } as import('./pipelineApi').PipelineTask);
    setShowNewTask(false);
    setNewTaskForm({ name: '', description: '', type: 'general', priority: 'medium', collection_id: '' });
    navigate(`/pipeline/${task.id}`);
  };

  const handleCreateColl = async () => {
    if (!newCollForm.name.trim()) return;
    await createCollection(newCollForm.name, '', newCollForm.color);
    setShowNewColl(false);
    setNewCollForm({ name: '', color: '#6366f1' });
  };

  return (
    <div style={{ minHeight: '100vh', background: t.bgMain, color: t.textPrimary, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* Top navigation */}
      <nav style={{ background: t.bgSurface, borderBottom: `1px solid ${t.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, color: t.accent }}>⬡</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: t.textPrimary, letterSpacing: '-0.02em' }}>Pipeline</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={toggleColorMode} style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 15 }} title="Toggle light/dark">
          {colorMode === 'dark' ? '☀' : '☽'}
        </button>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
        >
          ← Mind Map
        </button>
        <button
          onClick={() => setShowNewTask(true)}
          style={{ background: t.accent, border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          + New Task
        </button>
      </nav>

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

        {/* Left sidebar — collections */}
        <aside style={{ width: 220, background: t.bgSurface, borderRight: `1px solid ${t.border}`, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Collections</span>
            <button onClick={() => setShowNewColl(true)} style={{ background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }} title="New collection">+</button>
          </div>

          <button
            onClick={() => setSelectedCollectionId(null)}
            style={{
              background: !selectedCollectionId ? `${t.accent}18` : 'transparent',
              border: 'none', color: !selectedCollectionId ? t.accentText : t.textMuted,
              padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: !selectedCollectionId ? 600 : 400,
            }}
          >
            All Tasks <span style={{ float: 'right', opacity: 0.5 }}>{tasks.length}</span>
          </button>

          {collections.map(c => (
            <button key={c.id} onClick={() => setSelectedCollectionId(c.id)} style={{
              background: selectedCollectionId === c.id ? `${t.accent}18` : 'transparent',
              border: 'none', color: selectedCollectionId === c.id ? t.accentText : t.textMuted,
              padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 13,
              fontWeight: selectedCollectionId === c.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ opacity: 0.4, fontSize: 11 }}>{tasks.filter(tk => tk.collection_id === c.id).length}</span>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: t.textMuted }}>Loading…</div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
              <span style={{ fontSize: 48, opacity: 0.12, color: t.textSecondary }}>⬡</span>
              <p style={{ color: t.textMuted, fontSize: 14 }}>No tasks yet. Create your first task to get started.</p>
              <button onClick={() => setShowNewTask(true)} style={{ background: t.accent, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                + New Task
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filteredTasks.map(task => (
                <TaskCard key={task.id} task={task} collections={collections} theme={t} onOpen={() => navigate(`/pipeline/${task.id}`)} onDelete={() => deleteTask(task.id)} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* New Task Modal */}
      {showNewTask && (() => {
        const iSt: React.CSSProperties = { background: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrimary, padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
        const bP: React.CSSProperties = { background: t.accent, border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
        const bG: React.CSSProperties = { background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13 };
        return (
          <Modal title="New Task" onClose={() => setShowNewTask(false)} theme={t}>
            <Field label="Name" theme={t}>
              <input autoFocus value={newTaskForm.name} onChange={e => setNewTaskForm(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCreateTask()} placeholder="e.g. Implement OAuth, Edit YouTube Intro" style={iSt} />
            </Field>
            <Field label="Description" theme={t}>
              <textarea value={newTaskForm.description} onChange={e => setNewTaskForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="What is this task about?" style={{ ...iSt, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Type" theme={t}>
                <select value={newTaskForm.type} onChange={e => setNewTaskForm(p => ({ ...p, type: e.target.value }))} style={iSt}>
                  {TASK_TYPES.map(tp => <option key={tp} value={tp}>{TYPE_ICON[tp]} {tp.charAt(0).toUpperCase() + tp.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Priority" theme={t}>
                <select value={newTaskForm.priority} onChange={e => setNewTaskForm(p => ({ ...p, priority: e.target.value }))} style={iSt}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </Field>
            </div>
            <Field label="Collection (optional)" theme={t}>
              <select value={newTaskForm.collection_id} onChange={e => setNewTaskForm(p => ({ ...p, collection_id: e.target.value }))} style={iSt}>
                <option value="">None</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setShowNewTask(false)} style={bG}>Cancel</button>
              <button onClick={handleCreateTask} style={bP}>Create & Open</button>
            </div>
          </Modal>
        );
      })()}

      {/* New Collection Modal */}
      {showNewColl && (() => {
        const iSt: React.CSSProperties = { background: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrimary, padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
        const bP: React.CSSProperties = { background: t.accent, border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
        const bG: React.CSSProperties = { background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13 };
        return (
          <Modal title="New Collection" onClose={() => setShowNewColl(false)} theme={t}>
            <Field label="Name" theme={t}>
              <input autoFocus value={newCollForm.name} onChange={e => setNewCollForm(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleCreateColl()} placeholder="e.g. YouTube Projects, Sprint 42" style={iSt} />
            </Field>
            <Field label="Color" theme={t}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'].map(c => (
                  <button key={c} onClick={() => setNewCollForm(p => ({ ...p, color: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newCollForm.color === c ? `2px solid ${t.textPrimary}` : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setShowNewColl(false)} style={bG}>Cancel</button>
              <button onClick={handleCreateColl} style={bP}>Create</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function TaskCard({ task, collections, theme: t, onOpen, onDelete }: {
  task: PipelineTask;
  collections: import('./pipelineApi').PipelineCollection[];
  theme: PipelineTheme;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const s = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
  const total = task.node_count ?? 0;
  const done  = task.done_count  ?? 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const coll  = collections.find(c => c.id === task.collection_id);

  return (
    <div
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: 12 }}
      onClick={onOpen}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.accent; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${t.accent}, 0 4px 24px ${t.accent}18`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.border; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, color: TYPE_COLOR[task.type] ?? t.accent, lineHeight: 1.2, flexShrink: 0 }}>{TYPE_ICON[task.type] ?? '◈'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: t.textPrimary, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</div>
          {task.description && (
            <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'], lineHeight: 1.5 }}>{task.description}</div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); if (confirm('Delete this task?')) onDelete(); }} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }} title="Delete">×</button>
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted }}>
            <span>{done} / {total} steps done</span>
            <span style={{ color: pct === 100 ? '#10b981' : t.textSecondary, fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ height: 3, background: t.border, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : t.accent, borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>{s.label}</span>
        <span style={{ fontSize: 11, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[task.priority] ?? '#f59e0b' }} />
          {task.priority}
        </span>
        {coll && (
          <span style={{ fontSize: 11, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: coll.color }} />
            {coll.name}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted }}>{total} node{total !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, theme: t }: { title: string; onClose: () => void; children: React.ReactNode; theme: PipelineTheme }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 28, width: 460, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: t.textPrimary }}>{title}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, theme: t }: { label: string; children: React.ReactNode; theme: PipelineTheme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  );
}
