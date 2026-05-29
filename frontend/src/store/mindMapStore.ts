import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { api } from '../hooks/useApi';
import { buildDagreLayout } from '../layout/dagreLayout';
import { STATUS_CYCLE } from '../types/NodeTypes';
import type { MindMapNodeData, NodeStatus, Project } from '../types/NodeTypes';
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

  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  cycleStatus: (id: string) => Promise<void>;
  addChild: (parentId: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  updateNodeField: (id: string, patch: Partial<MindMapNodeData>) => Promise<void>;
}

function reLayout(rawNodes: MindMapNodeData[], expandedIds: Set<string>) {
  return buildDagreLayout(rawNodes, expandedIds);
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

  async loadProjects() {
    try {
      const projects = await api.getProjects();
      set({ projects });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async loadProject(id) {
    set({ loading: true, error: null });
    try {
      // Server returns flat { id, name, description, ..., nodes: [] }
      const { nodes, ...project } = await api.getProjectWithNodes(id);
      // Expand root nodes by default
      const expandedIds = new Set(nodes.filter((n) => !n.parent_id).map((n) => n.id));
      const { rfNodes, rfEdges } = reLayout(nodes, expandedIds);
      // Set project data immediately so the canvas appears
      set({ currentProject: project, rawNodes: nodes, expandedIds, rfNodes, rfEdges, loading: false });
      // Persist selection fire-and-forget — never block or crash the UI for this
      api.selectProject(id).catch(() => {});
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  toggleExpand(id) {
    const { rawNodes, expandedIds } = get();
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    const { rfNodes, rfEdges } = reLayout(rawNodes, next);
    set({ expandedIds: next, rfNodes, rfEdges });
  },

  expandAll() {
    const { rawNodes } = get();
    // Every node that is someone's parent_id should be in expandedIds
    const parentIds = new Set(
      rawNodes.filter((n) => n.parent_id).map((n) => n.parent_id as string)
    );
    const { rfNodes, rfEdges } = reLayout(rawNodes, parentIds);
    set({ expandedIds: parentIds, rfNodes, rfEdges });
  },

  collapseAll() {
    const { rawNodes } = get();
    const { rfNodes, rfEdges } = reLayout(rawNodes, new Set());
    set({ expandedIds: new Set(), rfNodes, rfEdges });
  },

  async cycleStatus(id) {
    const { rawNodes, expandedIds } = get();
    const node = rawNodes.find((n) => n.id === id);
    if (!node) return;
    const currentIdx = STATUS_CYCLE.indexOf(node.status);
    const nextStatus: NodeStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    try {
      await api.updateNode(id, { status: nextStatus });
      const updated = rawNodes.map((n) => (n.id === id ? { ...n, status: nextStatus } : n));
      const { rfNodes, rfEdges } = reLayout(updated, expandedIds);
      set({ rawNodes: updated, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async addChild(parentId) {
    const { rawNodes, expandedIds, currentProject } = get();
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
      const { rfNodes, rfEdges } = reLayout(updated, next);
      set({ rawNodes: updated, expandedIds: next, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async deleteNode(id) {
    const { rawNodes, expandedIds } = get();
    try {
      await api.deleteNode(id);
      // Remove node and all descendants
      const toRemove = new Set<string>();
      const collect = (nid: string) => {
        toRemove.add(nid);
        rawNodes.filter((n) => n.parent_id === nid).forEach((c) => collect(c.id));
      };
      collect(id);
      const updated = rawNodes.filter((n) => !toRemove.has(n.id));
      const next = new Set([...expandedIds].filter((eid) => !toRemove.has(eid)));
      const { rfNodes, rfEdges } = reLayout(updated, next);
      set({ rawNodes: updated, expandedIds: next, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async updateNodeField(id, patch) {
    const { rawNodes, expandedIds } = get();
    try {
      await api.updateNode(id, patch);
      const updated = rawNodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
      const { rfNodes, rfEdges } = reLayout(updated, expandedIds);
      set({ rawNodes: updated, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
