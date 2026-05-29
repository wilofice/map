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
  const { cycleStatus, toggleExpand, addChild, deleteNode, selectedNodeId } = useMindMapStore();

  const depth      = data.depth_level ?? 0;
  const isRoot     = depth === 0;
  const mode       = data.displayMode ?? 'comfortable';
  const dir        = data.layoutDir ?? 'LR';
  const nodeWidth  = NODE_DIMS[mode].width;
  const isSelected = selectedNodeId === data.id;

  // Handle positions depend on layout direction
  const targetPos = dir === 'LR' ? Position.Left  : Position.Top;
  const sourcePos = dir === 'LR' ? Position.Right : Position.Bottom;

  const priorityColor = PRIORITY_COLOR[data.priority];
  const status        = STATUS_CONFIG[data.status];

  // Depth-based dark backgrounds (neon pro — very dark blue-black)
  const bgColor   = isRoot ? '#0d1829' : depth === 1 ? '#080e1a' : '#060b16';
  const titleSize = isRoot ? 'text-[14px] font-semibold' : depth === 1 ? 'text-[13px] font-medium' : 'text-[12px]';
  const titleWrap = mode === 'comfortable' ? 'whitespace-normal break-words leading-snug' : 'truncate leading-tight';
  const px        = isRoot ? 'px-3' : 'px-2';
  const py        = isRoot ? 'py-2.5' : 'py-2';
  const minH      = isRoot ? 'min-h-[44px]' : 'min-h-[40px]';

  // Neon glow: border shadow tinted by priority color
  const nodeShadow = selected || isSelected
    ? `0 0 0 1.5px #3b82f6, 0 0 18px rgba(59,130,246,0.5), 0 0 8px ${priorityColor}50`
    : `0 0 10px ${priorityColor}28, inset 0 1px 0 rgba(255,255,255,0.04)`;

  // Subtle priority-color bleed from the left edge
  const nodeBg = `radial-gradient(ellipse 55% 100% at 0% 50%, ${priorityColor}14 0%, ${bgColor} 55%)`;

  return (
    <div className="relative group" style={{ width: nodeWidth }}>
      <Handle
        type="target"
        position={targetPos}
        style={{ background: '#1e3a5f', width: 5, height: 5, border: 'none', boxShadow: '0 0 4px #3b82f6aa' }}
      />

      <div
        className="rounded-lg border transition-all duration-200"
        style={{
          background: nodeBg,
          borderColor: selected || isSelected ? '#3b82f6' : '#152035',
          borderLeftWidth: isRoot ? 5 : 4,
          borderLeftColor: priorityColor,
          boxShadow: nodeShadow,
        }}
      >
        <div className={`flex items-center gap-1.5 ${px} ${py} ${minH}`}>

          {/* Expand / collapse toggle */}
          {data.hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(data.id); }}
              className="text-slate-600 hover:text-slate-200 text-[10px] w-4 h-4 flex items-center justify-center shrink-0 transition-colors"
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
              className={`block rounded-full transition-all ${status.pulse ? 'animate-pulse' : ''} ${isRoot ? 'w-3 h-3' : 'w-2.5 h-2.5'}`}
              style={{
                background: status.color,
                boxShadow: `0 0 8px ${status.color}, 0 0 16px ${status.color}80`,
              }}
            />
          </button>

          {/* Title */}
          <span
            className={`${titleSize} ${titleWrap} text-slate-100 flex-1 select-none tracking-wide`}
            title={data.title}
          >
            {data.title}
          </span>

          {/* Action buttons — appear on hover */}
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={(e) => { e.stopPropagation(); addChild(data.id); }}
              className="text-[11px] text-slate-500 hover:text-green-400 w-5 h-5 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
              title="Add child"
            >+</button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(data.id); }}
              className="text-[11px] text-slate-500 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
              title="Delete"
            >×</button>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={sourcePos}
        style={{ background: '#1e3a5f', width: 5, height: 5, border: 'none', boxShadow: '0 0 4px #3b82f6aa' }}
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
export default MindMapNode;
