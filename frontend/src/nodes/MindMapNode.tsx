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

  const depth      = data.depth_level ?? 0;
  const isRoot     = depth === 0;
  const mode       = data.displayMode ?? 'compact';
  const nodeWidth  = NODE_DIMS[mode].width;
  const isSelected = selectedNodeId === data.id;

  const priorityColor = PRIORITY_COLOR[data.priority];
  const status        = STATUS_CONFIG[data.status];

  // Depth-based visual hierarchy
  const bgColor    = isRoot ? '#1f2d47' : depth === 1 ? '#1a2035' : '#151c2e';
  const titleSize  = isRoot ? 'text-[14px] font-semibold' : depth === 1 ? 'text-[13px] font-medium' : 'text-[12px]';
  const titleWrap  = mode === 'comfortable' ? 'whitespace-normal break-words leading-snug' : 'truncate leading-tight';
  const px         = isRoot ? 'px-3' : 'px-2';
  const py         = isRoot ? 'py-2.5' : 'py-2';
  const minH       = isRoot ? 'min-h-[44px]' : 'min-h-[40px]';

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
            : 'hover:border-slate-500/60'
        }`}
        style={{
          background: bgColor,
          borderColor: selected || isSelected ? '#3b82f6' : '#2d3a52',
          borderLeftWidth: isRoot ? 4 : 3,
          borderLeftColor: priorityColor,
        }}
      >
        <div className={`flex items-center gap-1.5 ${px} ${py} ${minH}`}>

          {/* Expand / collapse toggle */}
          {data.hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(data.id); }}
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
            onClick={(e) => { e.stopPropagation(); cycleStatus(data.id); }}
            title={`${status.label} — click to change`}
            className="shrink-0 flex items-center justify-center w-4 h-4"
          >
            <span
              className={`block rounded-full transition-colors ${status.pulse ? 'animate-pulse' : ''} ${isRoot ? 'w-3 h-3' : 'w-2.5 h-2.5'}`}
              style={{ background: status.color, boxShadow: `0 0 5px ${status.color}55` }}
            />
          </button>

          {/* Title */}
          <span
            className={`${titleSize} ${titleWrap} text-slate-100 flex-1 select-none`}
            title={data.title}
          >
            {data.title}
          </span>

          {/* Action buttons — appear on hover */}
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
            <button
              onClick={(e) => { e.stopPropagation(); addChild(data.id); }}
              className="text-[11px] text-slate-400 hover:text-green-400 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
              title="Add child"
            >+</button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(data.id); }}
              className="text-[11px] text-slate-400 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
              title="Delete"
            >×</button>
          </div>
        </div>
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
