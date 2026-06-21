import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { api } from '../hooks/useApi';
import { buildDagreLayout } from '../layout/dagreLayout';
import { STATUS_CYCLE } from '../types/NodeTypes';
import type { MindMapNodeData, NodeStatus, Project } from '../types/NodeTypes';
import type { DisplayMode, LayoutDir } from '../config/nodeDimensions';
import type { ThemeKey } from '../theme/themes';
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
  selectedNodeId: string | null;
  detailPanelOpen: boolean;
  clickOpensPanel: boolean;
  mapLocked: boolean;
  theme: ThemeKey;

  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  cycleStatus: (id: string) => Promise<void>;
  addChild: (parentId: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  updateNodeField: (id: string, patch: Partial<MindMapNodeData>) => Promise<void>;
  deleteProjects: (ids: string[]) => Promise<void>;
  setDisplayMode: (mode: DisplayMode) => void;
  setLayoutDir: (dir: LayoutDir) => void;
  setSelectedNodeId: (id: string | null) => void;
  setDetailPanelOpen: (open: boolean) => void;
  toggleDetailPanel: () => void;
  setClickOpensPanel: (v: boolean) => void;
  setMapLocked: (v: boolean) => void;
  setTheme: (t: ThemeKey) => void;
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
  selectedNodeId: null,
  detailPanelOpen: false,
  clickOpensPanel: false,
  mapLocked: true,
  theme: 'ibm' as ThemeKey,

  async loadProjects() {
    try {
      const projects = await api.getProjects();
      set({ projects });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async loadProject(id) {
    set({ loading: true, error: null, selectedNodeId: null, detailPanelOpen: false });
    try {
      const { nodes, ...project } = await api.getProjectWithNodes(id);
      const expandedIds = new Set(nodes.filter((n) => !n.parent_id).map((n) => n.id));
      const displayMode = (project.display_mode as DisplayMode) ?? get().displayMode;
      const layoutDir   = (project.layout_dir  as LayoutDir)   ?? get().layoutDir;
      const { rfNodes, rfEdges } = reLayout(nodes, expandedIds, displayMode, layoutDir);
      set({ currentProject: project, rawNodes: nodes, expandedIds, rfNodes, rfEdges, loading: false, displayMode, layoutDir });
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

    // Collect node + all descendants recursively
    const toUpdate = new Set<string>();
    const collect = (nid: string) => {
      toUpdate.add(nid);
      rawNodes.filter((n) => n.parent_id === nid).forEach((c) => collect(c.id));
    };
    collect(id);

    try {
      await Promise.all([...toUpdate].map((nid) => api.updateNode(nid, { status: nextStatus })));
      const updated = rawNodes.map((n) => toUpdate.has(n.id) ? { ...n, status: nextStatus } : n);
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

  async deleteProjects(ids) {
    try {
      await Promise.all(ids.map((id) => api.deleteProject(id)));
      const { projects, currentProject } = get();
      const remaining = projects.filter((p) => !ids.includes(p.id));
      const wasCurrent = currentProject && ids.includes(currentProject.id);
      set({
        projects: remaining,
        ...(wasCurrent ? { currentProject: null, rawNodes: [], rfNodes: [], rfEdges: [], selectedNodeId: null } : {}),
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setDisplayMode(mode) {
    const { rawNodes, expandedIds, layoutDir, currentProject } = get();
    const { rfNodes, rfEdges } = reLayout(rawNodes, expandedIds, mode, layoutDir);
    set({ displayMode: mode, rfNodes, rfEdges });
    if (currentProject) api.updateProject(currentProject.id, { display_mode: mode }).catch(() => {});
  },

  setLayoutDir(dir) {
    const { rawNodes, expandedIds, displayMode, currentProject } = get();
    const { rfNodes, rfEdges } = reLayout(rawNodes, expandedIds, displayMode, dir);
    set({ layoutDir: dir, rfNodes, rfEdges });
    if (currentProject) api.updateProject(currentProject.id, { layout_dir: dir }).catch(() => {});
  },

  setSelectedNodeId(id) {
    set({ selectedNodeId: id });
  },

  setDetailPanelOpen(open) {
    set({ detailPanelOpen: open });
  },

  toggleDetailPanel() {
    set((s) => ({ detailPanelOpen: !s.detailPanelOpen }));
  },

  setClickOpensPanel(v) { set({ clickOpensPanel: v }); },
  setMapLocked(v) { set({ mapLocked: v }); },
  setTheme(t) { set({ theme: t }); },
}));
