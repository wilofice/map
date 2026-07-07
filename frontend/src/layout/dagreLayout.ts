import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { MindMapNodeData } from '../types/NodeTypes';
import { NODE_DIMS, type DisplayMode, type LayoutDir } from '../config/nodeDimensions';

const DEFAULT_EDGE_COLORS: [string, string, string] = [
  'rgba(69, 137, 255, 0.6)',
  'rgba(50, 175, 220, 0.5)',
  'rgba(139, 106, 240, 0.45)',
];

export function buildDagreLayout(
  nodes: MindMapNodeData[],
  expandedIds: Set<string>,
  mode: DisplayMode = 'comfortable',
  layoutDir: LayoutDir = 'LR',
  edgeColors: [string, string, string] = DEFAULT_EDGE_COLORS
): { rfNodes: Node[]; rfEdges: Edge[] } {
  const dims = NODE_DIMS[mode];
  const isHorizontal = layoutDir === 'LR' || layoutDir === 'RL';
  const ranksep = isHorizontal ? dims.lrRanksep : dims.tbRanksep;
  const nodesep = isHorizontal ? dims.lrNodesep : dims.tbNodesep;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: layoutDir, ranksep, nodesep, marginx: 40, marginy: 40 });

  // Precompute children map for O(1) lookups
  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parent_id) {
      let siblings = childrenMap.get(node.parent_id);
      if (!siblings) {
        siblings = [];
        childrenMap.set(node.parent_id, siblings);
      }
      siblings.push(node.id);
    }
  }

  // Collect visible nodes using BFS
  const visibleIds = new Set<string>();
  const queue: string[] = [];

  for (const node of nodes) {
    if (node.parent_id === null) {
      visibleIds.add(node.id);
      if (expandedIds.has(node.id)) {
        queue.push(node.id);
      }
    }
  }

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = childrenMap.get(parentId);
    if (children) {
      for (const childId of children) {
        visibleIds.add(childId);
        if (expandedIds.has(childId)) {
          queue.push(childId);
        }
      }
    }
  }

  const visibleNodes = nodes.filter((n) => visibleIds.has(n.id));

  for (const node of visibleNodes) {
    graph.setNode(node.id, { width: dims.width, height: dims.height });
  }
  for (const node of visibleNodes) {
    if (node.parent_id && visibleIds.has(node.parent_id)) {
      graph.setEdge(node.parent_id, node.id);
    }
  }

  dagre.layout(graph);

  const rfNodes: Node[] = visibleNodes.map((node) => {
    const pos = graph.node(node.id);
    const hasChildren = childrenMap.has(node.id);
    return {
      id: node.id,
      type: 'mindMapNode',
      position: { x: pos.x - dims.width / 2, y: pos.y - dims.height / 2 },
      data: {
        ...node,
        hasChildren,
        isExpanded: expandedIds.has(node.id),
        nodeWidth: dims.width,
        displayMode: mode,
        layoutDir,
      },
    };
  });

  const EDGE_COLOR: Record<number, string> = {
    1: edgeColors[0],
    2: edgeColors[1],
    3: edgeColors[2],
  };

  const rfEdges: Edge[] = visibleNodes
    .filter((n) => n.parent_id && visibleIds.has(n.parent_id))
    .map((n) => {
      const depth = n.depth_level ?? 1;
      const edgeColor = EDGE_COLOR[Math.min(depth, 3)];
      return {
        id: `e-${n.parent_id}-${n.id}`,
        source: n.parent_id as string,
        target: n.id,
        type: 'default',
        animated: true,
        style: {
          stroke: edgeColor,
          strokeWidth: depth <= 1 ? 1.5 : 1,
        },
      };
    });

  return { rfNodes, rfEdges };
}
