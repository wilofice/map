import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { MindMapNodeData } from '../types/NodeTypes';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 60;

export function buildDagreLayout(
  nodes: MindMapNodeData[],
  expandedIds: Set<string>
): { rfNodes: Node[]; rfEdges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', ranksep: 60, nodesep: 20, marginx: 40, marginy: 40 });

  // Determine which nodes are visible (root nodes + children of expanded nodes)
  const visibleIds = new Set<string>();
  for (const node of nodes) {
    if (node.parent_id === null) {
      visibleIds.add(node.id);
    }
  }

  // BFS to collect visible nodes
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parent_id && expandedIds.has(node.parent_id) && visibleIds.has(node.parent_id)) {
        if (!visibleIds.has(node.id)) {
          visibleIds.add(node.id);
          changed = true;
        }
      }
    }
  }

  const visibleNodes = nodes.filter((n) => visibleIds.has(n.id));

  // Register nodes in dagre
  for (const node of visibleNodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Register edges
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
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { ...node, hasChildren, isExpanded: expandedIds.has(node.id) },
    };
  });

  const rfEdges: Edge[] = visibleNodes
    .filter((n) => n.parent_id && visibleIds.has(n.parent_id))
    .map((n) => ({
      id: `e-${n.parent_id}-${n.id}`,
      source: n.parent_id as string,
      target: n.id,
      type: 'smoothstep',
      style: { stroke: '#475569', strokeWidth: 2 },
      animated: false,
    }));

  return { rfNodes, rfEdges };
}
