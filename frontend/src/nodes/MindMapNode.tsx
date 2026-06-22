import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Handle, Position } from '@xyflow/react';
import { useMindMapStore } from '../store/mindMapStore';
import { PRIORITY_COLOR, STATUS_CONFIG } from '../types/NodeTypes';
import { themes } from '../theme/themes';
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
    isRemoving?: boolean;
    staggerIndex?: number;
  };
  selected: boolean;
}

const MindMapNode = memo(({ data, selected }: MindMapNodeProps) => {
  const {
    toggleExpand, addChild, deleteNode, selectedNodeId, theme,
    animEntranceMode, animStaggerMs, animSpringDuration,
    typewriterEnabled, typewriterSpeedMs,
  } = useMindMapStore();
  const t = themes[theme];

  const depth      = data.depth_level ?? 0;
  const isRoot     = depth === 0;
  const mode       = data.displayMode ?? 'comfortable';
  const dir        = data.layoutDir ?? 'LR';
  const nodeWidth  = data.nodeWidth ?? NODE_DIMS[mode].width;
  const isActive      = selected || selectedNodeId === data.id;
  const isRemoving    = data.isRemoving ?? false;
  const staggerIndex  = data.staggerIndex ?? 0;
  // cascade: each node offset by animStaggerMs; sequential: each waits for the previous spring to finish
  const staggerDelay  = animEntranceMode === 'sequential'
    ? staggerIndex * animSpringDuration
    : staggerIndex * (animStaggerMs / 1000);

  // Typewriter: type the title letter-by-letter on mount only
  const [displayedTitle, setDisplayedTitle] = useState('');
  useEffect(() => {
    const fullTitle = data.title;
    if (!typewriterEnabled) { setDisplayedTitle(fullTitle); return; }
    let cancelled = false;
    const outerDelay = animEntranceMode === 'sequential'
      ? staggerIndex * animSpringDuration * 1000 + 60
      : staggerIndex * animStaggerMs + 60;
    const outer = setTimeout(() => {
      let i = 0;
      const tick = () => {
        if (cancelled) return;
        i++;
        setDisplayedTitle(fullTitle.slice(0, i));
        if (i < fullTitle.length) setTimeout(tick, typewriterSpeedMs);
      };
      tick();
    }, outerDelay);
    return () => { cancelled = true; clearTimeout(outer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentional mount-only

  // Slide in from the parent side so the node feels like it emerges from its parent
  const enterX = dir === 'LR' ? -22 : dir === 'RL' ? 22 : 0;
  const enterY = dir === 'TB' ? -22 : 0;

  const targetPos = dir === 'LR' ? Position.Left  : dir === 'RL' ? Position.Right : Position.Top;
  const sourcePos = dir === 'LR' ? Position.Right : dir === 'RL' ? Position.Left  : Position.Bottom;

  const priorityColor = PRIORITY_COLOR[data.priority] ?? '#8d8d8d';

  const titleSize = isRoot ? 'text-[18px] font-semibold' : depth === 1 ? 'text-[18px] font-medium' : 'text-[18px]';
  const titleWrap = mode === 'comfortable' ? 'whitespace-normal break-words leading-snug' : 'truncate leading-tight';
  const px  = isRoot ? 'px-3' : 'px-2.5';
  const py  = isRoot ? 'py-3' : 'py-2.5';
  const minH = isRoot ? 'min-h-[56px]' : 'min-h-[48px]';

  const cardShadow = isActive
    ? `0 0 0 2px ${t.selectionRing}, ${t.shadowRoot}`
    : isRoot
      ? t.shadowRoot
      : t.shadowCard;

  return (
    <motion.div
      className="relative group"
      style={{ width: nodeWidth }}
      initial={{ opacity: 0, scale: 0.80, x: enterX, y: enterY }}
      animate={
        isRemoving
          ? { opacity: 0, scale: 0.82, x: enterX * 0.6, y: enterY * 0.6 }
          : { opacity: 1, scale: 1, x: 0, y: 0 }
      }
      transition={
        isRemoving
          ? { duration: 0.15, ease: 'easeOut' }
          : { type: 'spring', duration: animSpringDuration, bounce: 0.15, delay: staggerDelay }
      }
    >
      <Handle
        type="target"
        position={targetPos}
        style={{ background: t.handle, width: 5, height: 5, border: 'none' }}
      />

      <div
        className="rounded border"
        style={{
          background: t.card,
          borderColor: t.cardBorder,
          borderLeftWidth: isRoot ? 4 : 3,
          borderLeftColor: priorityColor,
          borderRightWidth: isRoot ? 4 : 3,
          borderRightColor: (STATUS_CONFIG[data.status] ?? STATUS_CONFIG['pending']).color,
          boxShadow: cardShadow,
          transition: 'box-shadow 0.15s ease',
        }}
      >
        <div className={`flex items-center gap-1.5 ${px} ${py} ${minH}`}>

          {/* Expand / collapse toggle */}
          {data.hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(data.id); }}
              className="text-[10px] w-4 h-4 flex items-center justify-center shrink-0 transition-colors hover:text-[#f4f4f4]"
              style={{ color: t.textMuted }}
              title={data.isExpanded ? 'Collapse' : 'Expand'}
            >
              {data.isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}


          {/* Title */}
          <span
            className={`${titleSize} ${titleWrap} flex-1 select-none`}
            style={{ color: t.textPrimary }}
            title={data.title}
          >
            {displayedTitle || ' '}
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
        style={{ background: t.handle, width: 5, height: 5, border: 'none' }}
      />
    </motion.div>
  );
});

MindMapNode.displayName = 'MindMapNode';
export default MindMapNode;
