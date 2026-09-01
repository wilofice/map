import { useEffect, useState } from 'react';
import { usePipelineStore } from './pipelineStore';
import type { PipelineNode } from './pipelineApi';

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'To Do',      color: '#475569', bg: 'rgba(71,85,105,0.18)' },
  { value: 'in-progress', label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.18)' },
  { value: 'done',        label: 'Done',        color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
] as const;

const NODE_TYPES = ['step', 'decision', 'milestone', 'review'] as const;
const TYPE_ICON: Record<string, string> = { step: '→', decision: '◇', milestone: '★', review: '◎' };

export default function NodePanel() {
  const { currentTask, selectedNodeId, setPanelOpen, updateNode, deleteNode, createEdge } = usePipelineStore();
  const node = currentTask?.nodes.find(n => n.id === selectedNodeId);

  const [form, setForm] = useState<Partial<PipelineNode>>({});
  const [saving, setSaving] = useState(false);
  const [connectTarget, setConnectTarget] = useState('');
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    if (node) setForm({ title: node.title, description: node.description, status: node.status, type: node.type, notes: node.notes, cli_command: node.cli_command, due_date: node.due_date ?? '' });
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

  const otherNodes = currentTask.nodes.filter(n => n.id !== node.id);
  const outgoingEdges = currentTask.edges.filter(e => e.source_id === node.id);
  const incomingEdges = currentTask.edges.filter(e => e.target_id === node.id);

  return (
    <aside style={{
      width: 340, background: '#1a2540', borderLeft: '1px solid #2c3d5c',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #2c3d5c', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Node Detail</span>
        </div>
        <button onClick={() => setPanelOpen(false)} style={iconBtn}>×</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Status selector */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2d48' }}>
          <FieldLabel>Status</FieldLabel>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => save({ status: s.value })}
                style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  background: node.status === s.value ? s.bg : 'rgba(255,255,255,0.03)',
                  color: node.status === s.value ? s.color : '#4e6080',
                  outline: node.status === s.value ? `1px solid ${s.color}40` : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d48' }}>
          <FieldLabel>Type</FieldLabel>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {NODE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => save({ type: t })}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: `1px solid ${node.type === t ? '#6366f1' : '#2c3d5c'}`,
                  background: node.type === t ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: node.type === t ? '#818cf8' : '#475569',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}
              >
                {TYPE_ICON[t]} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d48' }}>
          <FieldLabel>Title</FieldLabel>
          <input
            value={form.title ?? ''}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            onBlur={e => handleBlur('title', e.target.value)}
            style={inputSt}
          />
        </div>

        {/* Description */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d48' }}>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={form.description ?? ''}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            onBlur={e => handleBlur('description', e.target.value)}
            rows={4}
            placeholder="What needs to be done?"
            style={{ ...inputSt, resize: 'vertical' }}
          />
        </div>

        {/* Notes */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d48' }}>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={form.notes ?? ''}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            onBlur={e => handleBlur('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes, context, links…"
            style={{ ...inputSt, resize: 'vertical' }}
          />
        </div>

        {/* CLI Command */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d48' }}>
          <FieldLabel>CLI Command</FieldLabel>
          <input
            value={form.cli_command ?? ''}
            onChange={e => setForm(p => ({ ...p, cli_command: e.target.value }))}
            onBlur={e => handleBlur('cli_command', e.target.value)}
            placeholder="e.g. npm run build"
            style={{ ...inputSt, fontFamily: 'ui-monospace, monospace', color: '#86efac' }}
          />
        </div>

        {/* Due date */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d48' }}>
          <FieldLabel>Due Date</FieldLabel>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={e => { setForm(p => ({ ...p, due_date: e.target.value })); save({ due_date: e.target.value }); }}
            style={inputSt}
          />
        </div>

        {/* Connections */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d48' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <FieldLabel>Connections</FieldLabel>
            <button onClick={() => setShowConnect(v => !v)} style={{ background: 'rgba(99,102,241,0.12)', border: 'none', color: '#818cf8', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              + Connect
            </button>
          </div>

          {showConnect && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select
                value={connectTarget}
                onChange={e => setConnectTarget(e.target.value)}
                style={{ ...inputSt, flex: 1 }}
              >
                <option value="">Select target node…</option>
                {otherNodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
              </select>
              <button onClick={handleConnect} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                Add →
              </button>
            </div>
          )}

          {(incomingEdges.length > 0 || outgoingEdges.length > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {incomingEdges.map(e => {
                const src = currentTask.nodes.find(n => n.id === e.source_id);
                return src ? (
                  <EdgeRow key={e.id} label={`← ${src.title}`} edgeId={e.id} />
                ) : null;
              })}
              {outgoingEdges.map(e => {
                const tgt = currentTask.nodes.find(n => n.id === e.target_id);
                return tgt ? (
                  <EdgeRow key={e.id} label={`→ ${tgt.title}`} edgeId={e.id} />
                ) : null;
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#4e6080', margin: 0 }}>No connections yet.</p>
          )}
        </div>

        {saving && <div style={{ padding: '8px 20px', fontSize: 11, color: '#475569' }}>Saving…</div>}
      </div>

      {/* Footer actions */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #2c3d5c', display: 'flex', gap: 10 }}>
        <button
          onClick={() => { if (confirm('Delete this node?')) { deleteNode(node.id); setPanelOpen(false); } }}
          style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Delete Node
        </button>
      </div>
    </aside>
  );
}

function EdgeRow({ label, edgeId }: { label: string; edgeId: string }) {
  const { deleteEdge } = usePipelineStore();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
      <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
      <button onClick={() => deleteEdge(edgeId)} style={{ background: 'transparent', border: 'none', color: '#4e6080', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }} title="Remove">×</button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</div>;
}

const inputSt: React.CSSProperties = {
  background: '#1e2d48', border: '1px solid #2c3d5c', color: '#e2e8f0',
  padding: '8px 10px', borderRadius: 8, fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', marginTop: 6,
};

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 4px',
};
