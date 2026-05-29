import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useMindMapStore } from '../store/mindMapStore';
import { PRIORITY_COLOR, STATUS_ICON } from '../types/NodeTypes';
import type { MindMapNodeData } from '../types/NodeTypes';

interface MindMapNodeProps {
  data: MindMapNodeData & { hasChildren: boolean; isExpanded: boolean };
  selected: boolean;
}

const MindMapNode = memo(({ data, selected }: MindMapNodeProps) => {
  const { cycleStatus, toggleExpand, addChild, deleteNode } = useMindMapStore();
  const [showContent, setShowContent] = useState(false);

  const priorityColor = PRIORITY_COLOR[data.priority];
  const statusIcon = STATUS_ICON[data.status];
  const hasCode = data.code_content && data.code_language;
  const hasComment = !!data.content;
  const hasPrompt = !!data.task_prompt;
  const hasCli = !!data.cli_command;
  const hasExtra = hasCode || hasComment || hasPrompt || hasCli;

  return (
    <div
      className="relative"
      style={{ width: 240 }}
    >
      {/* Target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#475569', width: 8, height: 8, border: 'none' }}
      />

      {/* Main node box */}
      <div
        className={`rounded-lg border transition-all duration-150 ${
          selected ? 'ring-2 ring-blue-400' : ''
        }`}
        style={{
          background: '#1e2433',
          borderColor: selected ? '#3b82f6' : '#334155',
          borderLeftWidth: 4,
          borderLeftColor: priorityColor,
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-1 px-2 py-2 min-h-[44px]">
          {/* Expand / collapse toggle */}
          {data.hasChildren ? (
            <button
              onClick={() => toggleExpand(data.id)}
              className="text-slate-400 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded shrink-0"
              title={data.isExpanded ? 'Collapse' : 'Expand'}
            >
              {data.isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          {/* Status icon (click to cycle) */}
          <button
            onClick={() => cycleStatus(data.id)}
            className="text-sm shrink-0 hover:scale-110 transition-transform"
            title={`Status: ${data.status} — click to cycle`}
          >
            {statusIcon}
          </button>

          {/* Title */}
          <span
            className="text-sm text-slate-100 font-medium leading-tight flex-1 truncate"
            title={data.title}
          >
            {data.title}
          </span>

          {/* Action icons */}
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasExtra && (
              <button
                onClick={() => setShowContent((v) => !v)}
                className="text-xs text-slate-400 hover:text-slate-200 px-1"
                title="Toggle details"
              >
                {showContent ? '▴' : '▾'}
              </button>
            )}
            <button
              onClick={() => addChild(data.id)}
              className="text-xs text-slate-400 hover:text-green-400 px-1"
              title="Add child node"
            >
              +
            </button>
            <button
              onClick={() => deleteNode(data.id)}
              className="text-xs text-slate-400 hover:text-red-400 px-1"
              title="Delete node"
            >
              ×
            </button>
          </div>
        </div>

        {/* Date row */}
        {(data.start_date || data.end_date) && (
          <div className="px-3 pb-1 text-xs text-slate-500 flex gap-2">
            {data.start_date && <span>▶ {data.start_date}</span>}
            {data.end_date && <span>◀ {data.end_date}</span>}
            {data.days_spent ? <span>⏱ {data.days_spent}d</span> : null}
          </div>
        )}

        {/* Expandable details */}
        {showContent && hasExtra && (
          <div className="border-t border-slate-700 px-3 py-2 space-y-2">
            {hasComment && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">💬 Comment</div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{data.content}</p>
              </div>
            )}
            {hasCode && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  {'<>'} Code ({data.code_language})
                  <button
                    onClick={() => navigator.clipboard.writeText(data.code_content!)}
                    className="ml-2 text-blue-400 hover:text-blue-300"
                  >
                    copy
                  </button>
                </div>
                <pre className="text-xs text-slate-300 bg-slate-900 rounded p-2 overflow-auto max-h-40 whitespace-pre">
                  {data.code_content}
                </pre>
              </div>
            )}
            {hasPrompt && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  🤖 AI Prompt
                  <button
                    onClick={() => navigator.clipboard.writeText(data.task_prompt!)}
                    className="ml-2 text-blue-400 hover:text-blue-300"
                  >
                    copy
                  </button>
                </div>
                <p className="text-xs text-slate-300 bg-slate-900 rounded p-2 whitespace-pre-wrap max-h-32 overflow-auto">
                  {data.task_prompt}
                </p>
              </div>
            )}
            {hasCli && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  $ CLI Command
                  <button
                    onClick={() => navigator.clipboard.writeText(data.cli_command!)}
                    className="ml-2 text-blue-400 hover:text-blue-300"
                  >
                    copy
                  </button>
                </div>
                <pre className="text-xs text-green-300 bg-slate-900 rounded p-2 whitespace-pre-wrap max-h-24 overflow-auto">
                  {data.cli_command}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#475569', width: 8, height: 8, border: 'none' }}
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
export default MindMapNode;
