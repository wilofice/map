import { useEffect, useRef, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import MindMapNode from './nodes/MindMapNode';
import { useMindMapStore } from './store/mindMapStore';

const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode as unknown as NodeTypes['mindMapNode'],
};

function FlowCanvas() {
  const {
    rfNodes: storeNodes, rfEdges: storeEdges,
    selectedNodeId, rawNodes,
    setSelectedNodeId, toggleExpand,
  } = useMindMapStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const { fitView, panBy } = useReactFlow();

  // Refs so the keydown handler never goes stale without re-registering
  const selectedRef = useRef(selectedNodeId);
  const rawNodesRef = useRef(rawNodes);
  selectedRef.current  = selectedNodeId;
  rawNodesRef.current  = rawNodes;

  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [storeNodes, storeEdges, setNodes, setEdges, fitView]);

  useEffect(() => {
    const PAN_STEP = 120;
    const PAN_MAP: Record<string, { x: number; y: number }> = {
      ArrowRight: { x: -PAN_STEP, y: 0 },
      ArrowLeft:  { x:  PAN_STEP, y: 0 },
      ArrowDown:  { x: 0, y: -PAN_STEP },
      ArrowUp:    { x: 0, y:  PAN_STEP },
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Arrow keys — pan the viewport
      if (e.key in PAN_MAP) {
        e.preventDefault();
        panBy(PAN_MAP[e.key]);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        return;
      }

      if (e.key === 'Enter') {
        if (tag === 'BUTTON') return;
        const id = selectedRef.current;
        if (!id) return;
        const hasChildren = rawNodesRef.current.some(n => n.parent_id === id);
        if (hasChildren) {
          e.preventDefault();
          toggleExpand(id);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggleExpand, setSelectedNodeId, panBy]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      colorMode="dark"
      nodesDraggable={false}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.08}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: '#111111' }}
    >
      <Controls />
      <Background variant={BackgroundVariant.Dots} color="#2d2d2d" gap={24} size={1} />
    </ReactFlow>
  );
}

export default function MindMapFlow() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
