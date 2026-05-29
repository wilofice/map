import { useMindMapStore } from '../store/mindMapStore';
import { STATUS_CONFIG, STATUS_CYCLE, PRIORITY_COLOR, PRIORITY_LABEL } from '../types/NodeTypes';
import type { NodeStatus } from '../types/NodeTypes';

export default function DetailPanel() {
  const { rawNodes, selectedNodeId, setSelectedNodeId, cycleStatus } = useMindMapStore();

  if (!selectedNodeId) return null;
  const node = rawNodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const status = STATUS_CONFIG[node.status];
  const nextStatus: NodeStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % STATUS_CYCLE.length];
  const priorityColor = PRIORITY_COLOR[node.priority];

  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <aside className="flex flex-col w-80 shrink-0 border-l border-slate-700/60 bg-[#13192a] overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 shrink-0">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Node detail</span>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-slate-500 hover:text-white text-lg leading-none transition-colors"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Title */}
        <div>
          <div
            className="w-1 h-full rounded-full inline-block mr-2 align-middle"
            style={{ background: priorityColor }}
          />
          <h2 className="text-[15px] font-semibold text-slate-100 leading-snug inline">
            {node.title}
          </h2>
        </div>

        {/* Status + Priority badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => cycleStatus(node.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:brightness-110"
            style={{
              color: status.color,
              borderColor: `${status.color}44`,
              background: `${status.color}18`,
            }}
            title={`Click to change → ${nextStatus}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${status.pulse ? 'animate-pulse' : ''}`}
              style={{ background: status.color }}
            />
            {status.label}
          </button>

          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{
              color: priorityColor,
              borderColor: `${priorityColor}44`,
              background: `${priorityColor}18`,
            }}
          >
            {PRIORITY_LABEL[node.priority]}
          </span>

          {node.depth_level !== undefined && (
            <span className="text-[10px] text-slate-600">Level {node.depth_level}</span>
          )}
        </div>

        {/* Dates */}
        {(node.start_date || node.end_date || node.days_spent) && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Timeline</div>
            <div className="flex gap-3 flex-wrap text-xs text-slate-400">
              {node.start_date  && <span><span className="text-blue-400">▶</span> {node.start_date}</span>}
              {node.end_date    && <span><span className="text-red-400">◀</span> {node.end_date}</span>}
              {!!node.days_spent && <span>⏱ {node.days_spent} days spent</span>}
            </div>
          </div>
        )}

        <hr className="border-slate-700/60" />

        {/* Comment */}
        {node.content && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">💬 Comment</span>
              <button onClick={() => copy(node.content!)} className="text-[10px] text-blue-400 hover:text-blue-300">copy</button>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-[#0f1117]/60 rounded p-2">
              {node.content}
            </p>
          </div>
        )}

        {/* Code */}
        {node.code_content && node.code_language && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                {'</>'} {node.code_language}
              </span>
              <button onClick={() => copy(node.code_content!)} className="text-[10px] text-blue-400 hover:text-blue-300">copy</button>
            </div>
            <pre className="text-xs text-slate-300 bg-[#0f1117] rounded p-2 overflow-auto max-h-48 whitespace-pre">
              {node.code_content}
            </pre>
          </div>
        )}

        {/* AI Prompt */}
        {node.task_prompt && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">🤖 AI Prompt</span>
              <button onClick={() => copy(node.task_prompt!)} className="text-[10px] text-blue-400 hover:text-blue-300">copy</button>
            </div>
            <p className="text-xs text-slate-300 bg-[#0f1117] rounded p-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">
              {node.task_prompt}
            </p>
          </div>
        )}

        {/* CLI */}
        {node.cli_command && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">$ CLI</span>
              <button onClick={() => copy(node.cli_command!)} className="text-[10px] text-blue-400 hover:text-blue-300">copy</button>
            </div>
            <pre className="text-xs text-green-300 bg-[#0f1117] rounded p-2 whitespace-pre-wrap max-h-32 overflow-auto">
              {node.cli_command}
            </pre>
          </div>
        )}

        {/* Node ID (useful for debugging / referencing) */}
        <div className="pt-2 border-t border-slate-700/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">ID</span>
            <button onClick={() => copy(node.id)} className="text-[10px] text-slate-600 hover:text-slate-400 font-mono truncate max-w-[200px]">
              {node.id}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
