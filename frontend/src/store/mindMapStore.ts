import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { api } from '../hooks/useApi';
import { buildDagreLayout } from '../layout/dagreLayout';
import { STATUS_CYCLE } from '../types/NodeTypes';
import type { MindMapNodeData, NodeStatus, Project } from '../types/NodeTypes';
import type { DisplayMode, LayoutDir, NodeStyle } from '../config/nodeDimensions';
import { v4 as uuidv4 } from 'uuid';

interface MindMapState {
  projects: Project[];
  currentProject: Project | null;
  rawNodes: MindMapNodeData[];
  expandedIds: Set<string>;
  rfNodes: Node[];
  rfEdges: Edge[];
  loading: boolean;
  error: string | null;
  displayMode: DisplayMode;
  layoutDir: LayoutDir;
  nodeStyle: NodeStyle;
  selectedNodeId: string | null;

  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  cycleStatus: (id: string) => Promise<void>;
  addChild: (parentId: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  updateNodeField: (id: string, patch: Partial<MindMapNodeData>) => Promise<void>;
  setDisplayMode: (mode: DisplayMode) => void;
  setLayoutDir: (dir: LayoutDir) => void;
  setNodeStyle: (style: NodeStyle) => void;
  setSelectedNodeId: (id: string | null) => void;
}

function reLayout(
  rawNodes: MindMapNodeData[],
  expandedIds: Set<string>,
  mode: DisplayMode,
  dir: LayoutDir
) {
  return buildDagreLayout(rawNodes, expandedIds, mode, dir);
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  projects: [],
  currentProject: null,
  rawNodes: [],
  expandedIds: new Set(),
  rfNodes: [],
  rfEdges: [],
  loading: false,
  error: null,
  displayMode: 'comfortable',
  layoutDir: 'LR',
  nodeStyle: 'neon',
  selectedNodeId: null,

  async loadProjects() {
    try {
      const projects = await api.getProjects();
      set({ projects });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async loadProject(id) {
    set({ loading: true, error: null, selectedNodeId: null });
    try {
      const { nodes, ...project } = await api.getProjectWithNodes(id);
      const expandedIds = new Set(nodes.filter((n) => !n.parent_id).map((n) => n.id));
      const { displayMode, layoutDir } = get();
      const { rfNodes, rfEdges } = reLayout(nodes, expandedIds, displayMode, layoutDir);
      set({ currentProject: project, rawNodes: nodes, expandedIds, rfNodes, rfEdges, loading: false });
      api.selectProject(id).catch(() => {});
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  toggleExpand(id) {
    const { rawNodes, expandedIds, displayMode, layoutDir } = get();
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    const { rfNodes, rfEdges } = reLayout(rawNodes, next, displayMode, layoutDir);
    set({ expandedIds: next, rfNodes, rfEdges });
  },

  expandAll() {
    const { rawNodes, displayMode, layoutDir } = get();
    const parentIds = new Set(rawNodes.filter((n) => n.parent_id).map((n) => n.parent_id as string));
    const { rfNodes, rfEdges } = reLayout(rawNodes, parentIds, displayMode, layoutDir);
    set({ expandedIds: parentIds, rfNodes, rfEdges });
  },

  collapseAll() {
    const { rawNodes, displayMode, layoutDir } = get();
    const { rfNodes, rfEdges } = reLayout(rawNodes, new Set(), displayMode, layoutDir);
    set({ expandedIds: new Set(), rfNodes, rfEdges });
  },

  async cycleStatus(id) {
    const { rawNodes, expandedIds, displayMode, layoutDir } = get();
    const node = rawNodes.find((n) => n.id === id);
    if (!node) return;
    const nextStatus: NodeStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % STATUS_CYCLE.length];
    try {
      await api.updateNode(id, { status: nextStatus });
      const updated = rawNodes.map((n) => (n.id === id ? { ...n, status: nextStatus } : n));
      const { rfNodes, rfEdges } = reLayout(updated, expandedIds, displayMode, layoutDir);
      set({ rawNodes: updated, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async addChild(parentId) {
    const { rawNodes, expandedIds, currentProject, displayMode, layoutDir } = get();
    if (!currentProject) return;
    const parent = rawNodes.find((n) => n.id === parentId);
    const newNode: Partial<MindMapNodeData> & { project_id: string; title: string } = {
      id: uuidv4(),
      project_id: currentProject.id,
      parent_id: parentId,
      title: 'New node',
      status: 'pending',
      priority: 'medium',
      sort_order: rawNodes.filter((n) => n.parent_id === parentId).length,
      depth_level: (parent?.depth_level ?? 0) + 1,
    };
    try {
      const created = await api.createNode(newNode);
      const updated = [...rawNodes, created];
      const next = new Set(expandedIds);
      next.add(parentId);
      const { rfNodes, rfEdges } = reLayout(updated, next, displayMode, layoutDir);
      set({ rawNodes: updated, expandedIds: next, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async deleteNode(id) {
    const { rawNodes, expandedIds, displayMode, layoutDir, selectedNodeId } = get();
    try {
      await api.deleteNode(id);
      const toRemove = new Set<string>();
      const collect = (nid: string) => {
        toRemove.add(nid);
        rawNodes.filter((n) => n.parent_id === nid).forEach((c) => collect(c.id));
      };
      collect(id);
      const updated = rawNodes.filter((n) => !toRemove.has(n.id));
      const next = new Set([...expandedIds].filter((eid) => !toRemove.has(eid)));
      const { rfNodes, rfEdges } = reLayout(updated, next, displayMode, layoutDir);
      set({
        rawNodes: updated, expandedIds: next, rfNodes, rfEdges,
        selectedNodeId: toRemove.has(selectedNodeId ?? '') ? null : selectedNodeId,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async updateNodeField(id, patch) {
    const { rawNodes, expandedIds, displayMode, layoutDir } = get();
    try {
      await api.updateNode(id, patch);
      const updated = rawNodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
      const { rfNodes, rfEdges } = reLayout(updated, expandedIds, displayMode, layoutDir);
      set({ rawNodes: updated, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setDisplayMode(mode) {
    const { rawNodes, expandedIds, layoutDir } = get();
    const { rfNodes, rfEdges } = reLayout(rawNodes, expandedIds, mode, layoutDir);
    set({ displayMode: mode, rfNodes, rfEdges });
  },

  setLayoutDir(dir) {
    const { rawNodes, expandedIds, displayMode } = get();
    const { rfNodes, rfEdges } = reLayout(rawNodes, expandedIds, displayMode, dir);
    set({ layoutDir: dir, rfNodes, rfEdges });
  },

  setNodeStyle(style) {
    set({ nodeStyle: style });
  },

  setSelectedNodeId(id) {
    set({ selectedNodeId: id });
  },
}));
