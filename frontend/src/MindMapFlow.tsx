import { useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import MindMapNode from './nodes/MindMapNode';
import { useMindMapStore } from './store/mindMapStore';

const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode as unknown as NodeTypes['mindMapNode'],
};

function FlowCanvas() {
  const { rfNodes: storeNodes, rfEdges: storeEdges } = useMindMapStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const { fitView } = useReactFlow();

  // Sync layout from store into local RF state
  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
    // Fit view after layout changes
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [storeNodes, storeEdges, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: '#0f1117' }}
    >
      <MiniMap
        nodeColor={(node) => {
          const d = node.data as { priority?: string };
          if (d.priority === 'high') return '#f87171';
          if (d.priority === 'medium') return '#facc15';
          return '#4ade80';
        }}
        style={{ background: '#1e2433', border: '1px solid #334155' }}
      />
      <Controls style={{ background: '#1e2433', border: '1px solid #334155' }} />
      <Background variant={BackgroundVariant.Dots} color="#334155" gap={20} size={1} />
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
