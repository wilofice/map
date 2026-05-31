import { useRef } from 'react';
import { useMindMapStore } from '../store/mindMapStore';
import { STATUS_CONFIG, STATUS_CYCLE, PRIORITY_COLOR, PRIORITY_LABEL } from '../types/NodeTypes';
import type { NodeStatus, NodePriority } from '../types/NodeTypes';

const PRIORITY_CYCLE: NodePriority[] = ['low', 'medium', 'high'];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[#6f6f6f] uppercase tracking-wide mb-1">
      {children}
    </div>
  );
}

function FieldInput({
  value, placeholder, onSave, multiline = false, monospace = false,
}: {
  value: string; placeholder?: string; onSave: (v: string) => void;
  multiline?: boolean; monospace?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const cls = `w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs
    text-[#c6c6c6] placeholder-[#525252] resize-none outline-none
    focus:border-[#4589ff] focus:bg-[#222] transition-colors
    ${monospace ? 'font-mono' : ''}`;

  const handle = () => {
    const v = ref.current?.value ?? '';
    if (v !== value) onSave(v);
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        defaultValue={value}
        placeholder={placeholder}
        rows={3}
        className={cls}
        onBlur={handle}
      />
    );
  }
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      className={cls + ' h-7'}
      onBlur={handle}
    />
  );
}

export default function DetailPanel() {
  const { rawNodes, selectedNodeId, setSelectedNodeId, cycleStatus, updateNodeField } = useMindMapStore();

  if (!selectedNodeId) return null;
  const node = rawNodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const status     = STATUS_CONFIG[node.status];
  const nextStatus: NodeStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % STATUS_CYCLE.length];
  const priorityColor = PRIORITY_COLOR[node.priority];
  const nextPriority: NodePriority = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(node.priority) + 1) % PRIORITY_CYCLE.length];

  const save = (patch: Parameters<typeof updateNodeField>[1]) => updateNodeField(node.id, patch);
  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <aside className="flex flex-col w-80 shrink-0 border-l border-[#2a2a2a] bg-[#161616] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] shrink-0">
        <span className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Node detail</span>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-[#6f6f6f] hover:text-[#f4f4f4] text-lg leading-none transition-colors"
          title="Close (Esc)"
        >×</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Title */}
        <div>
          <Label>Title</Label>
          <textarea
            key={node.id + '-title'}
            defaultValue={node.title}
            rows={2}
            className="w-full bg-transparent border-b border-[#333] text-[14px] font-semibold
              text-[#e8e8e8] placeholder-[#525252] resize-none outline-none pb-1
              focus:border-[#4589ff] transition-colors"
            style={{ borderLeftColor: priorityColor, borderLeftWidth: 3, paddingLeft: 8 }}
            onBlur={(e) => { if (e.target.value.trim()) save({ title: e.target.value.trim() }); }}
          />
        </div>

        {/* Status + Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => cycleStatus(node.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:brightness-110"
            style={{ color: status.color, borderColor: `${status.color}55`, background: `${status.color}18` }}
            title={`Click → ${nextStatus}`}
          >
            <span className={`w-2 h-2 rounded-full ${status.pulse ? 'animate-pulse' : ''}`} style={{ background: status.color }} />
            {status.label}
          </button>

          <button
            onClick={() => save({ priority: nextPriority })}
            className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:brightness-110"
            style={{ color: priorityColor, borderColor: `${priorityColor}55`, background: `${priorityColor}18` }}
            title={`Click → ${nextPriority}`}
          >
            {PRIORITY_LABEL[node.priority]}
          </button>

          {node.depth_level !== undefined && (
            <span className="text-[10px] text-[#525252]">L{node.depth_level}</span>
          )}
        </div>

        <hr className="border-[#2a2a2a]" />

        {/* Timeline */}
        <div>
          <Label>Timeline</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-[#525252] mb-0.5">Start</div>
              <input
                key={node.id + '-start'}
                type="date"
                defaultValue={node.start_date ?? ''}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
                  text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors
                  [color-scheme:dark]"
                onBlur={(e) => save({ start_date: e.target.value || undefined })}
              />
            </div>
            <div>
              <div className="text-[10px] text-[#525252] mb-0.5">End</div>
              <input
                key={node.id + '-end'}
                type="date"
                defaultValue={node.end_date ?? ''}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
                  text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors
                  [color-scheme:dark]"
                onBlur={(e) => save({ end_date: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[10px] text-[#525252] mb-0.5">Days spent</div>
            <input
              key={node.id + '-days'}
              type="number"
              min={0}
              defaultValue={node.days_spent ?? ''}
              placeholder="0"
              className="w-24 bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
                text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors"
              onBlur={(e) => save({ days_spent: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>

        <hr className="border-[#2a2a2a]" />

        {/* Comment */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>💬 Comment</Label>
            {node.content && <button onClick={() => copy(node.content!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff]">copy</button>}
          </div>
          <FieldInput
            key={node.id + '-content'}
            value={node.content ?? ''}
            placeholder="Add a note…"
            multiline
            onSave={(v) => save({ content: v })}
          />
        </div>

        {/* Code */}
        <div>
          <Label>{'</>'} Code</Label>
          <input
            key={node.id + '-lang'}
            type="text"
            defaultValue={node.code_language ?? ''}
            placeholder="Language (e.g. typescript)"
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
              text-[#c6c6c6] placeholder-[#525252] outline-none focus:border-[#4589ff]
              transition-colors mb-1.5"
            onBlur={(e) => save({ code_language: e.target.value || undefined })}
          />
          <div className="relative">
            {node.code_content && (
              <button
                onClick={() => copy(node.code_content!)}
                className="absolute top-1 right-1 text-[10px] text-[#4589ff] hover:text-[#78a9ff] z-10"
              >copy</button>
            )}
            <FieldInput
              key={node.id + '-code'}
              value={node.code_content ?? ''}
              placeholder="Paste code here…"
              multiline monospace
              onSave={(v) => save({ code_content: v })}
            />
          </div>
        </div>

        {/* AI Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>🤖 AI Prompt</Label>
            {node.task_prompt && <button onClick={() => copy(node.task_prompt!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff]">copy</button>}
          </div>
          <FieldInput
            key={node.id + '-prompt'}
            value={node.task_prompt ?? ''}
            placeholder="Describe the task for the AI…"
            multiline
            onSave={(v) => save({ task_prompt: v })}
          />
        </div>

        {/* CLI */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>$ CLI Command</Label>
            {node.cli_command && <button onClick={() => copy(node.cli_command!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff]">copy</button>}
          </div>
          <textarea
            key={node.id + '-cli'}
            defaultValue={node.cli_command ?? ''}
            placeholder="npm run …"
            rows={2}
            className="w-full bg-[#071908] border border-[#0e3a0e] rounded px-2 py-1.5 text-xs
              font-mono text-[#42be65] placeholder-[#1a5c1a] resize-none outline-none
              focus:border-[#198038] transition-colors"
            onBlur={(e) => save({ cli_command: e.target.value || undefined })}
          />
        </div>

        {/* Node ID */}
        <div className="pt-2 border-t border-[#2a2a2a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#525252]">ID</span>
            <button onClick={() => copy(node.id)} className="text-[10px] text-[#525252] hover:text-[#8d8d8d] font-mono truncate max-w-[200px]">
              {node.id}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
