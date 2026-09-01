import { useEffect, useState } from 'react';
import { usePipelineStore } from './pipelineStore';
import type { PipelineNode } from './pipelineApi';
import type { PipelineTheme } from './pipelineTheme';

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'To Do',      color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  { value: 'in-progress', label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  { value: 'done',        label: 'Done',        color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
] as const;

const NODE_TYPES = ['step', 'decision', 'milestone', 'review'] as const;
const TYPE_ICON: Record<string, string> = { step: '→', decision: '◇', milestone: '★', review: '◎' };

export default function NodePanel({ theme: t }: { theme: PipelineTheme }) {
  const { currentTask, selectedNodeId, setPanelOpen, updateNode, deleteNode, createEdge } = usePipelineStore();
  const node = currentTask?.nodes.find(n => n.id === selectedNodeId);

  const [form, setForm] = useState<Partial<PipelineNode>>({});
  const [saving, setSaving] = useState(false);
  const [connectTarget, setConnectTarget] = useState('');
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    if (node) setForm({
      title: node.title, description: node.description,
      status: node.status, type: node.type,
      notes: node.notes, cli_command: node.cli_command,
      due_date: node.due_date ?? '',
    });
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node || !currentTask) return null;

  const save = async (patch: Partial<PipelineNode>) => {
    setSaving(true);
    await updateNode(node.id, patch);
    setSaving(false);
  };

  const handleBlur = (field: keyof PipelineNode, val: string) => {
    if ((node as unknown as Record<string, unknown>)[field] !== val) save({ [field]: val });
  };

  const handleConnect = async () => {
    if (!connectTarget || connectTarget === node.id) return;
    await createEdge(node.id, connectTarget);
    setConnectTarget('');
    setShowConnect(false);
  };

  const otherNodes    = currentTask.nodes.filter(n => n.id !== node.id);
  const outgoingEdges = currentTask.edges.filter(e => e.source_id === node.id);
  const incomingEdges = currentTask.edges.filter(e => e.target_id === node.id);

  const inputSt: React.CSSProperties = {
    background: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrimary,
    padding: '8px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box', marginTop: 6,
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</div>
  );

  const section = (content: React.ReactNode) => (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}` }}>{content}</div>
  );

  return (
    <aside style={{
      width: 340, background: t.bgSurface, borderLeft: `1px solid ${t.border}`,
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: t.textPrimary,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Node Detail</span>
        <button onClick={() => setPanelOpen(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 4px' }}>×</button>
      </div>

      {/* Status */}
      {section(<>
        <Label>Status</Label>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => save({ status: s.value })} style={{
              flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: node.status === s.value ? s.bg : `${t.bgCard}`,
              color: node.status === s.value ? s.color : t.textMuted,
              outline: node.status === s.value ? `1px solid ${s.color}50` : 'none',
              transition: 'all 0.15s',
            }}>{s.label}</button>
          ))}
        </div>
      </>)}

      {/* Type */}
      {section(<>
        <Label>Type</Label>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {NODE_TYPES.map(tp => (
            <button key={tp} onClick={() => save({ type: tp })} style={{
              padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              border: `1px solid ${node.type === tp ? t.accent : t.border}`,
              background: node.type === tp ? `${t.accent}18` : 'transparent',
              color: node.type === tp ? t.accentText : t.textMuted,
            }}>{TYPE_ICON[tp]} {tp}</button>
          ))}
        </div>
      </>)}

      {/* Title */}
      {section(<>
        <Label>Title</Label>
        <input value={form.title ?? ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} onBlur={e => handleBlur('title', e.target.value)} style={inputSt} />
      </>)}

      {/* Description */}
      {section(<>
        <Label>Description</Label>
        <textarea value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} onBlur={e => handleBlur('description', e.target.value)} rows={4} placeholder="What needs to be done?" style={{ ...inputSt, resize: 'vertical' }} />
      </>)}

      {/* Notes */}
      {section(<>
        <Label>Notes</Label>
        <textarea value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} onBlur={e => handleBlur('notes', e.target.value)} rows={3} placeholder="Context, links, references…" style={{ ...inputSt, resize: 'vertical' }} />
      </>)}

      {/* CLI */}
      {section(<>
        <Label>CLI Command</Label>
        <input value={form.cli_command ?? ''} onChange={e => setForm(p => ({ ...p, cli_command: e.target.value }))} onBlur={e => handleBlur('cli_command', e.target.value)} placeholder="e.g. npm run build" style={{ ...inputSt, fontFamily: 'ui-monospace, monospace', color: '#10b981' }} />
      </>)}

      {/* Due date */}
      {section(<>
        <Label>Due Date</Label>
        <input type="date" value={form.due_date ?? ''} onChange={e => { setForm(p => ({ ...p, due_date: e.target.value })); save({ due_date: e.target.value }); }} style={inputSt} />
      </>)}

      {/* Connections */}
      {section(<>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Label>Connections</Label>
          <button onClick={() => setShowConnect(v => !v)} style={{ background: `${t.accent}18`, border: 'none', color: t.accentText, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            + Connect
          </button>
        </div>

        {showConnect && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select value={connectTarget} onChange={e => setConnectTarget(e.target.value)} style={{ ...inputSt, flex: 1 }}>
              <option value="">Select target node…</option>
              {otherNodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
            <button onClick={handleConnect} style={{ background: t.accent, border: 'none', color: '#fff', padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', marginTop: 6 }}>Add →</button>
          </div>
        )}

        {incomingEdges.length === 0 && outgoingEdges.length === 0
          ? <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>No connections yet.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {incomingEdges.map(e => {
                const src = currentTask.nodes.find(n => n.id === e.source_id);
                return src ? <EdgeRow key={e.id} label={`← ${src.title}`} edgeId={e.id} t={t} /> : null;
              })}
              {outgoingEdges.map(e => {
                const tgt = currentTask.nodes.find(n => n.id === e.target_id);
                return tgt ? <EdgeRow key={e.id} label={`→ ${tgt.title}`} edgeId={e.id} t={t} /> : null;
              })}
            </div>
        }
      </>)}

      {saving && <div style={{ padding: '6px 20px', fontSize: 11, color: t.textMuted }}>Saving…</div>}

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${t.border}`, marginTop: 'auto' }}>
        <button
          onClick={() => { if (confirm('Delete this node?')) { deleteNode(node.id); setPanelOpen(false); } }}
          style={{ width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: t.danger, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Delete Node
        </button>
      </div>
    </aside>
  );
}

function EdgeRow({ label, edgeId, t }: { label: string; edgeId: string; t: PipelineTheme }) {
  const { deleteEdge } = usePipelineStore();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: `${t.bgCard}`, borderRadius: 6 }}>
      <span style={{ fontSize: 12, color: t.textMuted }}>{label}</span>
      <button onClick={() => deleteEdge(edgeId)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }} title="Remove">×</button>
    </div>
  );
}
