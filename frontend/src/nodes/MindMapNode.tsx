import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useMindMapStore } from '../store/mindMapStore';
import { PRIORITY_COLOR, STATUS_CONFIG } from '../types/NodeTypes';
import type { MindMapNodeData } from '../types/NodeTypes';

interface MindMapNodeProps {
  data: MindMapNodeData & { hasChildren: boolean; isExpanded: boolean };
  selected: boolean;
}

const MindMapNode = memo(({ data, selected }: MindMapNodeProps) => {
  const { cycleStatus, toggleExpand, addChild, deleteNode } = useMindMapStore();
  const [showContent, setShowContent] = useState(false);

  const priorityColor = PRIORITY_COLOR[data.priority];
  const status = STATUS_CONFIG[data.status];
  const hasCode    = data.code_content && data.code_language;
  const hasComment = !!data.content;
  const hasPrompt  = !!data.task_prompt;
  const hasCli     = !!data.cli_command;
  const hasExtra   = hasCode || hasComment || hasPrompt || hasCli;

  return (
    // "group" enables group-hover on child elements
    <div className="relative group" style={{ width: 240 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#334155', width: 6, height: 6, border: 'none' }}
      />

      <div
        className={`rounded-lg border transition-shadow duration-150 ${
          selected ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-900/40' : 'hover:border-slate-500'
        }`}
        style={{
          background: '#1a2035',
          borderColor: selected ? '#3b82f6' : '#2d3a52',
          borderLeftWidth: 3,
          borderLeftColor: priorityColor,
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-1.5 px-2 py-2 min-h-[42px]">

          {/* Expand / collapse toggle */}
          {data.hasChildren ? (
            <button
              onClick={() => toggleExpand(data.id)}
              className="text-slate-500 hover:text-slate-200 text-[10px] w-4 h-4 flex items-center justify-center shrink-0 transition-colors"
              title={data.isExpanded ? 'Collapse' : 'Expand'}
            >
              {data.isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Status dot — click to cycle */}
          <button
            onClick={() => cycleStatus(data.id)}
            title={`${status.label} — click to change`}
            className="shrink-0 flex items-center justify-center w-4 h-4"
          >
            <span
              className={`block w-2.5 h-2.5 rounded-full transition-colors ${status.pulse ? 'animate-pulse' : ''}`}
              style={{ background: status.color, boxShadow: `0 0 6px ${status.color}66` }}
            />
          </button>

          {/* Title */}
          <span
            className="text-[13px] text-slate-100 font-medium leading-tight flex-1 truncate select-none"
            title={data.title}
          >
            {data.title}
          </span>

          {/* Action buttons — visible on hover */}
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
            {hasExtra && (
              <button
                onClick={() => setShowContent(v => !v)}
                className="text-[11px] text-slate-400 hover:text-slate-100 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
                title="Toggle details"
              >
                {showContent ? '▴' : '▾'}
              </button>
            )}
            <button
              onClick={() => addChild(data.id)}
              className="text-[11px] text-slate-400 hover:text-green-400 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
              title="Add child node"
            >
              +
            </button>
            <button
              onClick={() => deleteNode(data.id)}
              className="text-[11px] text-slate-400 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
              title="Delete node"
            >
              ×
            </button>
          </div>
        </div>

        {/* Date row */}
        {(data.start_date || data.end_date) && (
          <div className="px-3 pb-1.5 flex gap-3 flex-wrap">
            {data.start_date && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <span style={{ color: '#3b82f6' }}>▶</span>
                {data.start_date}
              </span>
            )}
            {data.end_date && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <span style={{ color: '#f87171' }}>◀</span>
                {data.end_date}
              </span>
            )}
            {!!data.days_spent && (
              <span className="text-[10px] text-slate-500">⏱ {data.days_spent}d</span>
            )}
          </div>
        )}

        {/* Expandable details */}
        {showContent && hasExtra && (
          <div className="border-t border-slate-700/60 px-3 py-2 space-y-2.5">
            {hasComment && (
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">💬 Comment</div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{data.content}</p>
              </div>
            )}
            {hasCode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    {'<>'} {data.code_language}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(data.code_content!)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    copy
                  </button>
                </div>
                <pre className="text-xs text-slate-300 bg-[#0f1117] rounded p-2 overflow-auto max-h-40 whitespace-pre">
                  {data.code_content}
                </pre>
              </div>
            )}
            {hasPrompt && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">🤖 AI Prompt</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(data.task_prompt!)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    copy
                  </button>
                </div>
                <p className="text-xs text-slate-300 bg-[#0f1117] rounded p-2 whitespace-pre-wrap max-h-32 overflow-auto leading-relaxed">
                  {data.task_prompt}
                </p>
              </div>
            )}
            {hasCli && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">$ CLI</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(data.cli_command!)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    copy
                  </button>
                </div>
                <pre className="text-xs text-green-300 bg-[#0f1117] rounded p-2 whitespace-pre-wrap max-h-24 overflow-auto">
                  {data.cli_command}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#334155', width: 6, height: 6, border: 'none' }}
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
export default MindMapNode;
