import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useMindMapStore } from '../store/mindMapStore';
import { PRIORITY_COLOR, STATUS_CONFIG } from '../types/NodeTypes';
import type { MindMapNodeData } from '../types/NodeTypes';
import type { DisplayMode } from '../config/nodeDimensions';
import { NODE_DIMS } from '../config/nodeDimensions';

interface MindMapNodeProps {
  data: MindMapNodeData & {
    hasChildren: boolean;
    isExpanded: boolean;
    nodeWidth: number;
    displayMode: DisplayMode;
  };
  selected: boolean;
}

const MindMapNode = memo(({ data, selected }: MindMapNodeProps) => {
  const { cycleStatus, toggleExpand, addChild, deleteNode, selectedNodeId } = useMindMapStore();

  const depth = data.depth_level ?? 0;
  const isRoot = depth === 0;
  const mode = data.displayMode ?? 'compact';
  const nodeWidth = NODE_DIMS[mode].width;

  const priorityColor = PRIORITY_COLOR[data.priority];
  const status = STATUS_CONFIG[data.status];
  const isSelected = selectedNodeId === data.id;

  const hasCode    = !!(data.code_content && data.code_language);
  const hasComment = !!data.content;
  const hasPrompt  = !!data.task_prompt;
  const hasCli     = !!data.cli_command;
  const hasExtra   = hasCode || hasComment || hasPrompt || hasCli;

  // Depth-based visual hierarchy
  const bgColor  = isRoot ? '#1f2d47' : depth === 1 ? '#1a2035' : '#151c2e';
  const borderColor = selected || isSelected ? '#3b82f6' : '#2d3a52';
  const titleSize = isRoot
    ? 'text-[14px] font-semibold'
    : depth === 1
    ? 'text-[13px] font-medium'
    : 'text-[12px] font-normal';
  const titleClass = mode === 'comfortable'
    ? 'whitespace-normal break-words leading-snug'
    : 'truncate leading-tight';

  return (
    <div className="relative group" style={{ width: nodeWidth }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#334155', width: 5, height: 5, border: 'none' }}
      />

      <div
        className={`rounded-lg border transition-all duration-150 ${
          selected || isSelected
            ? 'ring-2 ring-blue-400/70 shadow-lg shadow-blue-900/30'
            : 'hover:border-slate-500/70'
        }`}
        style={{
          background: bgColor,
          borderColor,
          borderLeftWidth: isRoot ? 4 : 3,
          borderLeftColor: priorityColor,
        }}
      >
        {/* Header row */}
        <div
          className={`flex items-start gap-1.5 ${isRoot ? 'px-3 py-2.5' : 'px-2 py-2'}`}
          style={{ minHeight: isRoot ? 46 : 40 }}
        >
          {/* Expand / collapse */}
          {data.hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(data.id); }}
              className="text-slate-500 hover:text-slate-200 text-[10px] w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 transition-colors"
              title={data.isExpanded ? 'Collapse' : 'Expand'}
            >
              {data.isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Status dot */}
          <button
            onClick={(e) => { e.stopPropagation(); cycleStatus(data.id); }}
            title={`${status.label} — click to change`}
            className="shrink-0 mt-1 flex items-center justify-center w-4 h-4"
          >
            <span
              className={`block rounded-full transition-colors ${status.pulse ? 'animate-pulse' : ''} ${isRoot ? 'w-3 h-3' : 'w-2.5 h-2.5'}`}
              style={{ background: status.color, boxShadow: `0 0 5px ${status.color}55` }}
            />
          </button>

          {/* Title */}
          <span
            className={`${titleSize} ${titleClass} text-slate-100 flex-1 select-none`}
            title={data.title}
          >
            {data.title}
          </span>

          {/* Action buttons — visible on hover */}
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); addChild(data.id); }}
              className="text-[11px] text-slate-400 hover:text-green-400 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
              title="Add child node"
            >
              +
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(data.id); }}
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
                <span className="text-blue-500">▶</span>{data.start_date}
              </span>
            )}
            {data.end_date && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="text-red-400">◀</span>{data.end_date}
              </span>
            )}
            {!!data.days_spent && (
              <span className="text-[10px] text-slate-500">⏱ {data.days_spent}d</span>
            )}
          </div>
        )}

        {/* Content indicator — always visible when node has extra data */}
        {hasExtra && (
          <div className="px-3 pb-1.5 flex gap-2">
            {hasComment && <span className="text-[10px] text-slate-600" title="Has comment">💬</span>}
            {hasCode    && <span className="text-[10px] text-slate-600" title="Has code">{`</>`}</span>}
            {hasPrompt  && <span className="text-[10px] text-slate-600" title="Has AI prompt">🤖</span>}
            {hasCli     && <span className="text-[10px] text-slate-600" title="Has CLI command">$</span>}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#334155', width: 5, height: 5, border: 'none' }}
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
export default MindMapNode;
