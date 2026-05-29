import { useEffect, useCallback } from 'react';
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
  const { rfNodes: storeNodes, rfEdges: storeEdges, setSelectedNodeId } = useMindMapStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [storeNodes, storeEdges, setNodes, setEdges, fitView]);

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
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.08}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: '#0f1117' }}
    >
      <Controls style={{ background: '#13192a', border: '1px solid #2d3a52' }} />
      <Background variant={BackgroundVariant.Dots} color="#1e2a3a" gap={22} size={1} />
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
