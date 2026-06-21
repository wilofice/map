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
import { themes, type BgVariant } from './theme/themes';

const BG_VARIANT_MAP: Record<BgVariant, BackgroundVariant> = {
  dots:  BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross,
};

const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode as unknown as NodeTypes['mindMapNode'],
};

function FlowCanvas() {
  const {
    rfNodes: storeNodes, rfEdges: storeEdges,
    selectedNodeId, rawNodes, detailPanelOpen,
    clickOpensPanel, mapLocked, theme,
    setSelectedNodeId, toggleExpand, toggleDetailPanel, setDetailPanelOpen,
    undoLast, redoLast,
  } = useMindMapStore();

  const t = themes[theme];

  const clickOpensPanelRef = useRef(clickOpensPanel);
  clickOpensPanelRef.current = clickOpensPanel;
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const { fitView, getViewport, setViewport } = useReactFlow();

  // Refs so the keydown handler never goes stale without re-registering
  const selectedRef        = useRef(selectedNodeId);
  const rawNodesRef        = useRef(rawNodes);
  const detailPanelOpenRef = useRef(detailPanelOpen);
  selectedRef.current        = selectedNodeId;
  rawNodesRef.current        = rawNodes;
  detailPanelOpenRef.current = detailPanelOpen;

  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [storeNodes, storeEdges, setNodes, setEdges, fitView]);

  useEffect(() => {
    const PAN_STEP = 150;
    const PAN_DELTA: Record<string, [number, number]> = {
      ArrowRight: [-PAN_STEP, 0],
      ArrowLeft:  [ PAN_STEP, 0],
      ArrowDown:  [0, -PAN_STEP],
      ArrowUp:    [0,  PAN_STEP],
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Ctrl+Z — undo, Ctrl+Y / Ctrl+Shift+Z — redo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoLast(); return; }
      if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoLast(); return; }

      // Arrow keys — pan the viewport
      if (e.key in PAN_DELTA) {
        e.preventDefault();
        const [dx, dy] = PAN_DELTA[e.key];
        const { x, y, zoom } = getViewport();
        setViewport({ x: x + dx, y: y + dy, zoom }, { duration: 120 });
        return;
      }

      if (e.key === 'Escape') {
        // Close panel first; if already closed, deselect node
        if (detailPanelOpenRef.current) {
          setDetailPanelOpen(false);
        } else {
          setSelectedNodeId(null);
        }
        return;
      }

      // Enter — toggle the detail panel for the selected node
      if (e.key === 'Enter') {
        if (tag === 'BUTTON') return;
        if (!selectedRef.current) return;
        e.preventDefault();
        toggleDetailPanel();
        return;
      }

      // Space — expand/collapse children
      if (e.key === ' ') {
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
  }, [toggleExpand, toggleDetailPanel, setDetailPanelOpen, setSelectedNodeId, getViewport, setViewport, undoLast, redoLast]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
    if (clickOpensPanelRef.current) setDetailPanelOpen(true);
  }, [setSelectedNodeId, setDetailPanelOpen]);

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
      nodesDraggable={!mapLocked}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.08}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: t.canvas }}
    >
      <Controls />
      <Background variant={BG_VARIANT_MAP[t.bgVariant]} color={t.bgDots} gap={5} size={1} />
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
