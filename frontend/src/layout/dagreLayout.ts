import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { MindMapNodeData } from '../types/NodeTypes';
import { NODE_DIMS, type DisplayMode, type LayoutDir } from '../config/nodeDimensions';

export function buildDagreLayout(
  nodes: MindMapNodeData[],
  expandedIds: Set<string>,
  mode: DisplayMode = 'comfortable',
  layoutDir: LayoutDir = 'LR'
): { rfNodes: Node[]; rfEdges: Edge[] } {
  const dims = NODE_DIMS[mode];
  const isHorizontal = layoutDir === 'LR' || layoutDir === 'RL';
  const ranksep = isHorizontal ? dims.lrRanksep : dims.tbRanksep;
  const nodesep = isHorizontal ? dims.lrNodesep : dims.tbNodesep;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: layoutDir, ranksep, nodesep, marginx: 40, marginy: 40 });

  // Collect visible nodes: roots + children of expanded parents
  const visibleIds = new Set<string>();
  for (const node of nodes) {
    if (node.parent_id === null) visibleIds.add(node.id);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (
        node.parent_id &&
        expandedIds.has(node.parent_id) &&
        visibleIds.has(node.parent_id) &&
        !visibleIds.has(node.id)
      ) {
        visibleIds.add(node.id);
        changed = true;
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
    const hasChildren = nodes.some((n) => n.parent_id === node.id);
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

  const rfEdges: Edge[] = visibleNodes
    .filter((n) => n.parent_id && visibleIds.has(n.parent_id))
    .map((n) => {
      const depth = n.depth_level ?? 1;
      const edgeColor = depth <= 1 ? '#8d8d8d' : '#c6c6c6';
      return {
        id: `e-${n.parent_id}-${n.id}`,
        source: n.parent_id as string,
        target: n.id,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: edgeColor,
          strokeWidth: depth <= 1 ? 1.5 : 1,
        },
      };
    });

  return { rfNodes, rfEdges };
}
