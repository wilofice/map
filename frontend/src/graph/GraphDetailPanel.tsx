import { useState, useEffect } from 'react';
import { useGraphStore } from './cytoscapeStore';
import { themes } from '../theme/themes';
import { STATUS_CYCLE, STATUS_CONFIG, PRIORITY_COLOR, PRIORITY_LABEL } from '../types/NodeTypes';
import type { NodeStatus, NodePriority } from '../types/NodeTypes';

export default function GraphDetailPanel() {
  const {
    rawNodes, selectedNodeId, theme,
    updateNodeField, cycleStatus, addChild, deleteNode, setDetailPanelOpen,
  } = useGraphStore();

  const t = themes[theme];
  const node = rawNodes.find(n => n.id === selectedNodeId);

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setEditTitle(node.title);
      setEditContent(node.content ?? '');
    }
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null;

  const statusCfg = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.pending;
  const nextStatus: NodeStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % STATUS_CYCLE.length];

  const save = async () => {
    setSaving(true);
    await updateNodeField(node.id, { title: editTitle, content: editContent });
    setSaving(false);
  };

  const priorityEntries = Object.entries(PRIORITY_LABEL) as [NodePriority, string][];

  return (
    <aside
      className="w-80 flex flex-col border-l shrink-0 overflow-y-auto"
      style={{ background: t.surface, borderColor: t.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.border }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: t.textMuted }}>
          Node Detail
        </span>
        <button
          onClick={() => setDetailPanelOpen(false)}
          className="text-lg leading-none hover:opacity-80"
          style={{ color: t.textMuted }}
        >×</button>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4">

        {/* Status + Priority row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => cycleStatus(node.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
            style={{ background: `${statusCfg.color}22`, color: statusCfg.color }}
            title={`Click to set: ${nextStatus}`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: statusCfg.color, boxShadow: statusCfg.pulse ? `0 0 6px ${statusCfg.color}` : 'none' }}
            />
            {statusCfg.label}
          </button>

          <div className="flex gap-1">
            {priorityEntries.map(([p, label]) => (
              <button
                key={p}
                onClick={() => updateNodeField(node.id, { priority: p })}
                className="px-2 py-0.5 rounded text-[10px] font-medium transition-opacity"
                style={{
                  background: node.priority === p ? `${PRIORITY_COLOR[p]}22` : 'transparent',
                  color: PRIORITY_COLOR[p],
                  opacity: node.priority === p ? 1 : 0.4,
                  border: `1px solid ${node.priority === p ? PRIORITY_COLOR[p] : 'transparent'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-widest" style={{ color: t.textMuted }}>Title</label>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={save}
            className="w-full px-2 py-1.5 rounded text-sm outline-none"
            style={{ background: t.card, color: t.textPrimary, border: `1px solid ${t.cardBorder}` }}
          />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] uppercase tracking-widest" style={{ color: t.textMuted }}>Content</label>
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onBlur={save}
            rows={6}
            className="w-full px-2 py-1.5 rounded text-sm outline-none resize-none"
            style={{ background: t.card, color: t.textPrimary, border: `1px solid ${t.cardBorder}` }}
          />
        </div>

        {/* CLI command (read-only preview) */}
        {node.cli_command && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-widest" style={{ color: t.textMuted }}>CLI Command</label>
            <pre
              className="px-2 py-1.5 rounded text-xs overflow-x-auto"
              style={{ background: t.card, color: '#42be65', border: `1px solid ${t.cardBorder}` }}
            >{node.cli_command}</pre>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ color: t.textMuted }}>
          <div>
            <span className="uppercase tracking-widest block mb-0.5">Depth</span>
            <span style={{ color: t.textSecondary }}>{node.depth_level ?? 0}</span>
          </div>
          {node.start_date && (
            <div>
              <span className="uppercase tracking-widest block mb-0.5">Start</span>
              <span style={{ color: t.textSecondary }}>{node.start_date}</span>
            </div>
          )}
          {node.end_date && (
            <div>
              <span className="uppercase tracking-widest block mb-0.5">End</span>
              <span style={{ color: t.textSecondary }}>{node.end_date}</span>
            </div>
          )}
          {(node.days_spent ?? 0) > 0 && (
            <div>
              <span className="uppercase tracking-widest block mb-0.5">Days</span>
              <span style={{ color: t.textSecondary }}>{node.days_spent}</span>
            </div>
          )}
        </div>

        {saving && <span className="text-[11px]" style={{ color: t.textMuted }}>Saving…</span>}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: t.border }}>
          <button
            onClick={() => addChild(node.id)}
            className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
            style={{ background: 'rgba(66,190,101,0.12)', color: '#42be65' }}
          >
            + Add child
          </button>
          <button
            onClick={async () => {
              await deleteNode(node.id);
              setDetailPanelOpen(false);
            }}
            className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
            style={{ background: 'rgba(250,77,86,0.12)', color: '#fa4d56' }}
          >
            Delete
          </button>
        </div>
      </div>
    </aside>
  );
}
