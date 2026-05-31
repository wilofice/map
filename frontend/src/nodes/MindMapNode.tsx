import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useMindMapStore } from '../store/mindMapStore';
import { PRIORITY_COLOR, STATUS_CONFIG } from '../types/NodeTypes';
import type { MindMapNodeData } from '../types/NodeTypes';
import type { DisplayMode, LayoutDir } from '../config/nodeDimensions';
import { NODE_DIMS } from '../config/nodeDimensions';

interface MindMapNodeProps {
  data: MindMapNodeData & {
    hasChildren: boolean;
    isExpanded: boolean;
    nodeWidth: number;
    displayMode: DisplayMode;
    layoutDir: LayoutDir;
  };
  selected: boolean;
}

const MindMapNode = memo(({ data, selected }: MindMapNodeProps) => {
  const { toggleExpand, addChild, deleteNode, selectedNodeId } = useMindMapStore();

  const depth     = data.depth_level ?? 0;
  const isRoot    = depth === 0;
  const mode      = data.displayMode ?? 'comfortable';
  const dir       = data.layoutDir ?? 'LR';
  const nodeWidth = data.nodeWidth ?? NODE_DIMS[mode].width;
  const isActive  = selected || selectedNodeId === data.id;

  const targetPos = dir === 'LR' ? Position.Left  : dir === 'RL' ? Position.Right : Position.Top;
  const sourcePos = dir === 'LR' ? Position.Right : dir === 'RL' ? Position.Left  : Position.Bottom;

  const priorityColor = PRIORITY_COLOR[data.priority];

  const titleSize = isRoot ? 'text-[18px] font-semibold' : depth === 1 ? 'text-[18px] font-medium' : 'text-[18px]';
  const titleWrap = mode === 'comfortable' ? 'whitespace-normal break-words leading-snug' : 'truncate leading-tight';
  const px  = isRoot ? 'px-3' : 'px-2.5';
  const py  = isRoot ? 'py-3' : 'py-2.5';
  const minH = isRoot ? 'min-h-[56px]' : 'min-h-[48px]';

  const cardShadow = isActive
    ? `0 0 0 2px #4589ff, 0 2px 12px rgba(0,0,0,0.5)`
    : isRoot
      ? `0 2px 8px rgba(0,0,0,0.4)`
      : `0 1px 4px rgba(0,0,0,0.3)`;

  return (
    <div className="relative group" style={{ width: nodeWidth }}>
      <Handle
        type="target"
        position={targetPos}
        style={{ background: '#525252', width: 5, height: 5, border: 'none' }}
      />

      <div
        className="rounded border"
        style={{
          background: '#1e1e1e',
          borderColor: '#333333',
          borderLeftWidth: isRoot ? 4 : 3,
          borderLeftColor: priorityColor,
          boxShadow: cardShadow,
          transition: 'box-shadow 0.15s ease',
        }}
      >
        <div className={`flex items-center gap-1.5 ${px} ${py} ${minH}`}>

          {/* Expand / collapse toggle */}
          {data.hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(data.id); }}
              className="text-[#6f6f6f] hover:text-[#f4f4f4] text-[10px] w-4 h-4 flex items-center justify-center shrink-0 transition-colors"
              title={data.isExpanded ? 'Collapse' : 'Expand'}
            >
              {data.isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Status dot */}
          <span
            className={`shrink-0 rounded-full${data.status === 'in-progress' ? ' animate-pulse' : ''}`}
            style={{ width: 7, height: 7, background: STATUS_CONFIG[data.status].color }}
            title={STATUS_CONFIG[data.status].label}
          />

          {/* Title */}
          <span
            className={`${titleSize} ${titleWrap} text-[#e8e8e8] flex-1 select-none`}
            title={data.title}
          >
            {data.title}
          </span>

          {/* Action buttons — appear on hover */}
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={(e) => { e.stopPropagation(); addChild(data.id); }}
              className="text-[11px] text-[#6f6f6f] hover:text-[#42be65] w-5 h-5 flex items-center justify-center rounded hover:bg-[#042408] transition-colors"
              title="Add child"
            >+</button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(data.id); }}
              className="text-[11px] text-[#6f6f6f] hover:text-[#fa4d56] w-5 h-5 flex items-center justify-center rounded hover:bg-[#2d0709] transition-colors"
              title="Delete"
            >×</button>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={sourcePos}
        style={{ background: '#525252', width: 5, height: 5, border: 'none' }}
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
export default MindMapNode;
