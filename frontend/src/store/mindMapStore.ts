import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { api } from '../hooks/useApi';
import { buildDagreLayout } from '../layout/dagreLayout';
import { STATUS_CYCLE } from '../types/NodeTypes';
import type { MindMapNodeData, NodeStatus, Project } from '../types/NodeTypes';
import type { AiSuggestion } from '../hooks/useApi';

type UndoEntry =
  | { type: 'delete'; nodes: MindMapNodeData[] }
  | { type: 'add';    nodes: MindMapNodeData[] };
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
  moveToCollection: (projectIds: string[], collectionId: string) => Promise<void>;
  bulkAddChildren: (parentId: string, suggestions: AiSuggestion[]) => Promise<void>;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  undoLast: () => Promise<void>;
  redoLast: () => Promise<void>;
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
  theme: ((localStorage.getItem('mm-theme') as ThemeKey | null) ?? 'ibm'),
  undoStack: [] as UndoEntry[],
  redoStack: [] as UndoEntry[],

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
    const isCollapsing = expandedIds.has(id);

    if (isCollapsing) {
      // Collect all currently-visible descendants
      const toHide = new Set<string>();
      const collectVisible = (nid: string) => {
        rawNodes.filter((n) => n.parent_id === nid).forEach((child) => {
          toHide.add(child.id);
          if (expandedIds.has(child.id)) collectVisible(child.id);
        });
      };
      collectVisible(id);

      // Trigger exit animation on all children
      set((s) => ({
        rfNodes: s.rfNodes.map((n) =>
          toHide.has(n.id) ? { ...n, data: { ...n.data, isRemoving: true } } : n
        ),
      }));

      setTimeout(() => {
        const { rawNodes: rn, displayMode: dm, layoutDir: ld } = get();
        const next = new Set(expandedIds);
        next.delete(id);
        const { rfNodes, rfEdges } = reLayout(rn, next, dm, ld);
        set({ expandedIds: next, rfNodes, rfEdges });
      }, 165);
    } else {
      const next = new Set(expandedIds);
      next.add(id);
      const { rfNodes, rfEdges } = reLayout(rawNodes, next, displayMode, layoutDir);
      set({ expandedIds: next, rfNodes, rfEdges });
    }
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
    const { rawNodes, expandedIds, currentProject, displayMode, layoutDir, undoStack } = get();
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
      set({
        rawNodes: updated, expandedIds: next, rfNodes, rfEdges,
        undoStack: [...undoStack.slice(-19), { type: 'add', nodes: [created] }],
        redoStack: [],
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async deleteNode(id) {
    const { rawNodes, expandedIds, displayMode, layoutDir, selectedNodeId, undoStack } = get();
    const toRemove = new Set<string>();
    const collect = (nid: string) => {
      toRemove.add(nid);
      rawNodes.filter((n) => n.parent_id === nid).forEach((c) => collect(c.id));
    };
    collect(id);
    const deletedNodes = rawNodes.filter((n) => toRemove.has(n.id));

    // Trigger exit animation
    set((s) => ({
      rfNodes: s.rfNodes.map((n) =>
        toRemove.has(n.id) ? { ...n, data: { ...n.data, isRemoving: true } } : n
      ),
    }));
    await new Promise((r) => setTimeout(r, 165));

    try {
      await api.deleteNode(id);
      const updated = rawNodes.filter((n) => !toRemove.has(n.id));
      const next = new Set([...expandedIds].filter((eid) => !toRemove.has(eid)));
      const { rfNodes, rfEdges } = reLayout(updated, next, displayMode, layoutDir);
      set({
        rawNodes: updated, expandedIds: next, rfNodes, rfEdges,
        selectedNodeId: toRemove.has(selectedNodeId ?? '') ? null : selectedNodeId,
        undoStack: [...undoStack.slice(-19), { type: 'delete', nodes: deletedNodes }],
        redoStack: [],
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

  async bulkAddChildren(parentId, suggestions) {
    const { rawNodes, expandedIds, currentProject, displayMode, layoutDir, undoStack } = get();
    if (!currentProject || suggestions.length === 0) return;
    const parent = rawNodes.find((n) => n.id === parentId);
    const siblingCount = rawNodes.filter((n) => n.parent_id === parentId).length;

    const created: MindMapNodeData[] = [];
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const node = await api.createNode({
        id: uuidv4(),
        project_id: currentProject.id,
        parent_id: parentId,
        title: s.title,
        content: s.comment ?? '',
        status: s.status,
        priority: s.priority,
        sort_order: siblingCount + i,
        depth_level: (parent?.depth_level ?? 0) + 1,
      });
      created.push(node);
    }

    const updated = [...rawNodes, ...created];
    const next = new Set(expandedIds);
    next.add(parentId);
    const { rfNodes, rfEdges } = reLayout(updated, next, displayMode, layoutDir);
    set({
      rawNodes: updated, expandedIds: next, rfNodes, rfEdges,
      undoStack: [...undoStack.slice(-19), { type: 'add', nodes: created }],
      redoStack: [],
    });
  },

  async moveToCollection(projectIds, collectionId) {
    await Promise.all(projectIds.map((id) => api.updateProject(id, { collection_id: collectionId })));
    set((s) => ({
      projects: s.projects.map((p) =>
        projectIds.includes(p.id) ? { ...p, collection_id: collectionId } : p
      ),
    }));
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

  async undoLast() {
    const { undoStack, redoStack, rawNodes, expandedIds, displayMode, layoutDir } = get();
    if (!undoStack.length) return;
    const entry = undoStack[undoStack.length - 1];
    const remaining = undoStack.slice(0, -1);
    try {
      if (entry.type === 'add') {
        // Collect ALL local descendants (cascade handles DB side)
        const toRemove = new Set<string>();
        const descend = (nid: string) => {
          toRemove.add(nid);
          rawNodes.filter((n) => n.parent_id === nid).forEach((c) => descend(c.id));
        };
        entry.nodes.forEach((n) => descend(n.id));
        for (const node of entry.nodes) await api.deleteNode(node.id);
        const updated = rawNodes.filter((n) => !toRemove.has(n.id));
        const next = new Set([...expandedIds].filter((id) => !toRemove.has(id)));
        const { rfNodes, rfEdges } = reLayout(updated, next, displayMode, layoutDir);
        set({ rawNodes: updated, expandedIds: next, rfNodes, rfEdges, undoStack: remaining, redoStack: [...redoStack, entry] });
      } else {
        // Re-create nodes depth-first so parents exist before children
        const sorted = [...entry.nodes].sort((a, b) => (a.depth_level ?? 0) - (b.depth_level ?? 0));
        const recreated: MindMapNodeData[] = [];
        for (const node of sorted) recreated.push(await api.createNode(node));
        const { rawNodes: cur, expandedIds: expIds, displayMode: dm, layoutDir: ld } = get();
        const updated = [...cur, ...recreated];
        const { rfNodes, rfEdges } = reLayout(updated, expIds, dm, ld);
        set({ rawNodes: updated, rfNodes, rfEdges, undoStack: remaining, redoStack: [...redoStack, entry] });
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async redoLast() {
    const { undoStack, redoStack, rawNodes, expandedIds, displayMode, layoutDir } = get();
    if (!redoStack.length) return;
    const entry = redoStack[redoStack.length - 1];
    const remaining = redoStack.slice(0, -1);
    try {
      if (entry.type === 'add') {
        // Re-create nodes again
        const sorted = [...entry.nodes].sort((a, b) => (a.depth_level ?? 0) - (b.depth_level ?? 0));
        const recreated: MindMapNodeData[] = [];
        for (const node of sorted) recreated.push(await api.createNode(node));
        const { rawNodes: cur, expandedIds: expIds, displayMode: dm, layoutDir: ld } = get();
        const updated = [...cur, ...recreated];
        const next = new Set(expIds);
        entry.nodes.forEach((n) => { if (n.parent_id) next.add(n.parent_id); });
        const { rfNodes, rfEdges } = reLayout(updated, next, dm, ld);
        set({ rawNodes: updated, expandedIds: next, rfNodes, rfEdges, undoStack: [...undoStack, entry], redoStack: remaining });
      } else {
        // Delete the nodes again — find roots (nodes whose parent is NOT in the set)
        const nodeIds = new Set(entry.nodes.map((n) => n.id));
        const roots = entry.nodes.filter((n) => !n.parent_id || !nodeIds.has(n.parent_id ?? ''));
        for (const root of roots) await api.deleteNode(root.id);
        const toRemove = nodeIds;
        const updated = rawNodes.filter((n) => !toRemove.has(n.id));
        const next = new Set([...expandedIds].filter((id) => !toRemove.has(id)));
        const { rfNodes, rfEdges } = reLayout(updated, next, displayMode, layoutDir);
        set({ rawNodes: updated, expandedIds: next, rfNodes, rfEdges, undoStack: [...undoStack, entry], redoStack: remaining });
      }
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
  setTheme(t) { localStorage.setItem('mm-theme', t); set({ theme: t }); },
}));
