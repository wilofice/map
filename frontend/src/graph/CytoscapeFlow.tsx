import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';
import cytoscapeCoseBilkent from 'cytoscape-cose-bilkent';
import { useGraphStore } from './cytoscapeStore';
import { themes } from '../theme/themes';
import type { AppTheme } from '../theme/themes';
import { PRIORITY_COLOR } from '../types/NodeTypes';
import type { MindMapNodeData } from '../types/NodeTypes';
import type { GraphLayoutName } from './cytoscapeStore';

cytoscape.use(cytoscapeDagre);
cytoscape.use(cytoscapeCoseBilkent);

// Status background tints for node fill
const STATUS_BG: Record<string, string> = {
  pending:      'rgba(141,141,141,0.12)',
  'in-progress': 'rgba(69,137,255,0.18)',
  completed:    'rgba(66,190,101,0.15)',
};

function buildElements(nodes: MindMapNodeData[]) {
  const nodeEls = nodes.map(n => ({
    data: {
      id: n.id,
      label: n.title,
      status: n.status,
      priority: n.priority,
      depth: n.depth_level ?? 0,
    },
  }));

  const edgeEls = nodes
    .filter(n => n.parent_id)
    .map(n => ({
      data: {
        id: `e-${n.parent_id}-${n.id}`,
        source: n.parent_id as string,
        target: n.id,
        depth: n.depth_level ?? 1,
      },
    }));

  return [...nodeEls, ...edgeEls];
}

function buildLayoutOptions(name: GraphLayoutName, positions: Record<string, { x: number; y: number }>) {
  switch (name) {
    case 'dagre':
      return { name: 'dagre', rankDir: 'LR', rankSep: 90, nodeSep: 40, padding: 40, animate: false };
    case 'cose':
      return { name: 'cose-bilkent', quality: 'default', animate: true, animationDuration: 500, nodeRepulsion: 6000, idealEdgeLength: 120, edgeElasticity: 0.45, padding: 40 };
    case 'breadthfirst':
      return { name: 'breadthfirst', directed: true, spacingFactor: 1.6, padding: 40, animate: false };
    case 'circle':
      return { name: 'circle', spacingFactor: 1.4, padding: 40, animate: false };
    case 'grid':
      return { name: 'grid', spacingFactor: 1.3, padding: 40, animate: false };
    case 'manual':
      return {
        name: 'preset',
        positions: (el: cytoscape.NodeSingular) => positions[el.id()] ?? { x: Math.random() * 800, y: Math.random() * 600 },
        padding: 40,
        animate: false,
      };
    default:
      return { name: 'dagre', rankDir: 'LR', padding: 40, animate: false };
  }
}

function buildCyStyle(t: AppTheme): cytoscape.StylesheetStyle[] {
  return [
    {
      selector: 'node',
      style: {
        'shape': 'round-rectangle',
        'width': 200,
        'height': 56,
        'background-color': t.card,
        'border-width': 3,
        'border-color': '#525252',
        'label': 'data(label)',
        'color': t.textPrimary,
        'font-size': 13,
        'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'ellipsis',
        'text-max-width': '170px',
        'text-overflow-wrap': 'anywhere',
        'transition-property': 'border-color, background-color, opacity',
        'transition-duration': 200,
      } as cytoscape.Css.Node,
    },
    // Priority border colors
    ...(['low', 'medium', 'high'] as const).map(p => ({
      selector: `node[priority = "${p}"]`,
      style: { 'border-color': PRIORITY_COLOR[p] } as cytoscape.Css.Node,
    })),
    // Status background tints
    ...(['pending', 'in-progress', 'completed'] as const).map(s => ({
      selector: `node[status = "${s}"]`,
      style: { 'background-color': STATUS_BG[s] } as cytoscape.Css.Node,
    })),
    // Root nodes (depth 0) — slightly larger
    {
      selector: 'node[depth = 0]',
      style: {
        'width': 240,
        'height': 68,
        'font-size': 15,
        'font-weight': 'bold',
        'border-width': 4,
      } as cytoscape.Css.Node,
    },
    // Selected node
    {
      selector: 'node.selected',
      style: {
        'overlay-color': t.selectionRing,
        'overlay-padding': 6,
        'overlay-opacity': 0.2,
        'border-color': t.selectionRing,
        'border-width': 3,
      } as cytoscape.Css.Node,
    },
    // Edges
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': t.edgeColors[0],
        'target-arrow-color': t.edgeColors[0],
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'curve-style': 'bezier',
        'opacity': 0.7,
        'transition-property': 'opacity',
        'transition-duration': 200,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[depth > 1]',
      style: { 'line-color': t.edgeColors[1], 'target-arrow-color': t.edgeColors[1] } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[depth > 2]',
      style: { 'line-color': t.edgeColors[2], 'target-arrow-color': t.edgeColors[2] } as cytoscape.Css.Edge,
    },
  ];
}

export default function CytoscapeFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const {
    rawNodes, selectedNodeId, layoutName, savedPositions, theme,
    setSelectedNodeId, setDetailPanelOpen, saveNodePositions, saveViewport,
  } = useGraphStore();

  const t = themes[theme];

  // Init cytoscape once
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: buildCyStyle(t),
      elements: [],
      minZoom: 0.05,
      maxZoom: 3,
    });

    cyRef.current = cy;

    // Save viewport on pan/zoom end
    cy.on('viewport', () => {
      const zoom = cy.zoom();
      const pan = cy.pan();
      saveViewport(zoom, pan.x, pan.y);
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild elements & re-layout when data changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || rawNodes.length === 0) return;

    cy.batch(() => {
      cy.elements().remove();
      cy.add(buildElements(rawNodes));
    });

    const layoutOpts = buildLayoutOptions(layoutName, savedPositions);
    const layout = cy.layout(layoutOpts as cytoscape.LayoutOptions);
    layout.run();

    // Re-select the highlighted node
    cy.nodes().removeClass('selected');
    if (selectedNodeId) cy.$(`#${CSS.escape(selectedNodeId)}`).addClass('selected');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, layoutName]);

  // Re-apply selection class when selectedNodeId changes without a data reload
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass('selected');
    if (selectedNodeId) cy.$(`#${CSS.escape(selectedNodeId)}`).addClass('selected');
  }, [selectedNodeId]);

  // Re-style when theme changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style(buildCyStyle(t));
    cy.nodes().removeClass('selected');
    if (selectedNodeId) cy.$(`#${CSS.escape(selectedNodeId)}`).addClass('selected');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Wire up interactions (run once; stable refs via callback)
  const onNodeTap = useCallback((evt: cytoscape.EventObject) => {
    const id = (evt.target as cytoscape.NodeSingular).id();
    setSelectedNodeId(id);
    setDetailPanelOpen(true);
  }, [setSelectedNodeId, setDetailPanelOpen]);

  const onPaneTap = useCallback(() => {
    setSelectedNodeId(null);
    setDetailPanelOpen(false);
  }, [setSelectedNodeId, setDetailPanelOpen]);

  const onNodeDragFree = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const positions: Record<string, { x: number; y: number }> = {};
    cy.nodes().forEach(n => { positions[n.id()] = n.position(); });
    saveNodePositions(positions);
  }, [saveNodePositions]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.on('tap', 'node', onNodeTap);
    cy.on('tap', onPaneTap);
    cy.on('free', 'node', onNodeDragFree);

    return () => {
      cy.off('tap', 'node', onNodeTap);
      cy.off('tap', onPaneTap);
      cy.off('free', 'node', onNodeDragFree);
    };
  }, [onNodeTap, onPaneTap, onNodeDragFree]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: t.canvas }}
    />
  );
}
