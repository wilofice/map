import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { api } from '../hooks/useApi';
import { buildDagreLayout } from '../layout/dagreLayout';
import { STATUS_CYCLE } from '../types/NodeTypes';
import type { MindMapNodeData, NodeStatus, Project, ProjectWithNodes, Collection } from '../types/NodeTypes';
import type { AiSuggestion } from '../hooks/useApi';

type UndoEntry =
  | { type: 'delete'; nodes: MindMapNodeData[] }
  | { type: 'add';    nodes: MindMapNodeData[] };
import type { DisplayMode, LayoutDir } from '../config/nodeDimensions';
import { themes } from '../theme/themes';
import type { ThemeKey } from '../theme/themes';
import { v4 as uuidv4 } from 'uuid';

interface MindMapState {
  projects: Project[];
  collections: Collection[];
  currentProject: ProjectWithNodes | null;
  rawNodes: MindMapNodeData[];
  expandedIds: Set<string>;
  rfNodes: Node[];
  rfEdges: Edge[];
  loading: boolean;
  error: string | null;
  displayMode: DisplayMode;
  layoutDir: LayoutDir;
  selectedNodeId: string | null;
  focusedNodeId: string | null;
  detailPanelOpen: boolean;
  clickOpensPanel: boolean;
  mapLocked: boolean;
  theme: ThemeKey;
  pendingFitView: boolean;

  loadCollections: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  updateCollection: (id: string, patch: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  loadProjects: () => Promise<void>;
  clearPendingFitView: () => void;
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
  moveNodeUp: (id: string) => Promise<void>;
  moveNodeDown: (id: string) => Promise<void>;
  reverseChildren: (parentId: string) => Promise<void>;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  undoLast: () => Promise<void>;
  redoLast: () => Promise<void>;
  setDisplayMode: (mode: DisplayMode) => void;
  setLayoutDir: (dir: LayoutDir) => void;
  setSelectedNodeId: (id: string | null) => void;
  setFocusedNodeId: (id: string | null) => void;
  splitNode: (nodeId: string, groupATitle: string, groupAContent: string, groupBTitle: string, groupBContent: string) => Promise<void>;
  setDetailPanelOpen: (open: boolean) => void;
  toggleDetailPanel: () => void;
  setClickOpensPanel: (v: boolean) => void;
  setMapLocked: (v: boolean) => void;
  setTheme: (t: ThemeKey) => void;

  // Animation settings
  animEntranceMode: 'cascade' | 'sequential';
  animStaggerMs: number;
  animSpringDuration: number;
  typewriterEnabled: boolean;
  typewriterSpeedMs: number;
  settingsPanelOpen: boolean;
  setAnimEntranceMode: (mode: 'cascade' | 'sequential') => void;
  setAnimStaggerMs: (ms: number) => void;
  setAnimSpringDuration: (s: number) => void;
  setTypewriterEnabled: (v: boolean) => void;
  setTypewriterSpeedMs: (ms: number) => void;
  setSettingsPanelOpen: (v: boolean) => void;

  sequentialStep: number;
  incrementSequentialStep: () => void;
  resetSequentialStep: () => void;
  sequentialAutoPlay: boolean;
  sequentialAutoDelayMs: number;
  setSequentialAutoPlay: (v: boolean) => void;
  setSequentialAutoDelayMs: (ms: number) => void;
}

// Tracks the active theme's edge colors so every reLayout call gets them automatically.
const _initialTheme = (localStorage.getItem('mm-theme') as ThemeKey | null) ?? 'ibm';
let _edgeColors: [string, string, string] = themes[_initialTheme].edgeColors;

function reLayout(
  rawNodes: MindMapNodeData[],
  expandedIds: Set<string>,
  mode: DisplayMode,
  dir: LayoutDir,
  focusedNodeId?: string | null
) {
  const finalFocus = focusedNodeId !== undefined ? focusedNodeId : (useMindMapStore.getState ? useMindMapStore.getState().focusedNodeId : null);
  return buildDagreLayout(rawNodes, expandedIds, mode, dir, finalFocus, _edgeColors);
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  projects: [],
  collections: [],
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
  focusedNodeId: null,
  detailPanelOpen: false,
  clickOpensPanel: (localStorage.getItem('mm-click-opens-panel') ?? 'false') === 'true',
  mapLocked: (localStorage.getItem('mm-map-locked') ?? 'true') === 'true',
  theme: ((localStorage.getItem('mm-theme') as ThemeKey | null) ?? 'ibm'),
  pendingFitView: true,

  animEntranceMode: (localStorage.getItem('mm-anim-entrance') as 'cascade' | 'sequential' | null) ?? 'cascade',
  animStaggerMs: Number(localStorage.getItem('mm-anim-stagger-ms') ?? 100),
  animSpringDuration: Number(localStorage.getItem('mm-anim-spring-s') ?? 0.9),
  typewriterEnabled: (localStorage.getItem('mm-typewriter-enabled') ?? 'true') === 'true',
  typewriterSpeedMs: Number(localStorage.getItem('mm-typewriter-speed-ms') ?? 25),
  settingsPanelOpen: false,
  setSettingsPanelOpen: (v) => set({ settingsPanelOpen: v }),

  sequentialStep: 0,
  incrementSequentialStep: () => set((s) => ({ sequentialStep: s.sequentialStep + 1 })),
  resetSequentialStep: () => set({ sequentialStep: 0 }),
  sequentialAutoPlay: (localStorage.getItem('mm-seq-auto') ?? 'false') === 'true',
  sequentialAutoDelayMs: Number(localStorage.getItem('mm-seq-auto-delay-ms') ?? 800),
  undoStack: [] as UndoEntry[],
  redoStack: [] as UndoEntry[],

  loadCollections: async () => {
    try {
      const collections = await api.getCollections();
      set({ collections });
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  },

  createCollection: async (name, description) => {
    try {
      const coll = await api.createCollection(name, description);
      set((s) => ({ collections: [...s.collections, coll] }));
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  },

  updateCollection: async (id, patch) => {
    try {
      const coll = await api.updateCollection(id, patch);
      set((s) => ({
        collections: s.collections.map((c) => (c.id === id ? coll : c)),
      }));
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  },

  deleteCollection: async (id) => {
    try {
      await api.deleteCollection(id);
      set((s) => ({
        collections: s.collections.filter((c) => c.id !== id),
        projects: s.projects.map((p) => p.collection_id === id ? { ...p, collection_id: 'default-collection' } : p),
      }));
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  },

  async loadProjects() {
    try {
      const projects = await api.getProjects();
      set({ projects });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async loadProject(id) {
    set({ loading: true, error: null, selectedNodeId: null, focusedNodeId: null, detailPanelOpen: false });
    try {
      const { nodes, ...project } = await api.getProjectWithNodes(id);
      const expandedIds = new Set(nodes.filter((n) => !n.parent_id).map((n) => n.id));
      const displayMode = (project.display_mode as DisplayMode) ?? get().displayMode;
      const layoutDir   = (project.layout_dir  as LayoutDir)   ?? get().layoutDir;
      const { rfNodes, rfEdges } = reLayout(nodes, expandedIds, displayMode, layoutDir);
      set({ currentProject: { ...project, nodes }, rawNodes: nodes, expandedIds, rfNodes, rfEdges, loading: false, displayMode, layoutDir, pendingFitView: true });
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
      const prevIds = new Set(get().rfNodes.map((n) => n.id));
      const next = new Set(expandedIds);
      next.add(id);
      const { rfNodes: laid, rfEdges } = reLayout(rawNodes, next, displayMode, layoutDir);
      const newNodes = laid.filter(n => !prevIds.has(n.id));
      newNodes.sort((a, b) => {
        if (layoutDir === 'LR' || layoutDir === 'RL') return a.position.y - b.position.y;
        return a.position.x - b.position.x;
      });
      const staggerMap = new Map(newNodes.map((n, i) => [n.id, i]));

      const rfNodes = laid.map((n) =>
        prevIds.has(n.id) ? n : { ...n, data: { ...n.data, staggerIndex: staggerMap.get(n.id) } }
      );
      set({ expandedIds: next, rfNodes, rfEdges, sequentialStep: 0 });
    }
  },

  expandAll() {
    const { rawNodes, displayMode, layoutDir } = get();
    const parentIds = new Set(rawNodes.filter((n) => n.parent_id).map((n) => n.parent_id as string));
    const { rfNodes: laid, rfEdges } = reLayout(rawNodes, parentIds, displayMode, layoutDir);
    
    const newNodes = laid.filter(n => n.data.parent_id !== null); // Sort all non-root nodes
    newNodes.sort((a, b) => {
      if (layoutDir === 'LR' || layoutDir === 'RL') return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });
    const staggerMap = new Map(newNodes.map((n, i) => [n.id, i]));
    
    const rfNodes = laid.map((n) =>
      n.data.parent_id === null ? n : { ...n, data: { ...n.data, staggerIndex: staggerMap.get(n.id) } }
    );
    
    set({ expandedIds: parentIds, rfNodes, rfEdges, sequentialStep: 0 });
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
        content: s.content ?? s.comment ?? '',
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

  async moveNodeUp(id: string) {
    const { rawNodes, expandedIds, displayMode, layoutDir } = get();
    const node = rawNodes.find(n => n.id === id);
    if (!node) return;
    
    // Find siblings (same parent)
    const siblings = rawNodes.filter(n => n.parent_id === node.parent_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = siblings.findIndex(n => n.id === id);
    
    if (idx > 0) {
      // Swap sort_order with the previous sibling
      const prev = siblings[idx - 1];
      const updates = [
        { id: node.id, sort_order: prev.sort_order ?? 0 },
        { id: prev.id, sort_order: node.sort_order ?? 0 }
      ];
      
      try {
        await api.reorderNodes(updates);
        // Apply locally
        const newNodes = rawNodes.map(n => {
          if (n.id === node.id) return { ...n, sort_order: updates[0].sort_order };
          if (n.id === prev.id) return { ...n, sort_order: updates[1].sort_order };
          return n;
        }).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const { rfNodes, rfEdges } = reLayout(newNodes, expandedIds, displayMode, layoutDir);
        set({ rawNodes: newNodes, rfNodes, rfEdges });
      } catch (e) {
        set({ error: String(e) });
      }
    }
  },

  async moveNodeDown(id: string) {
    const { rawNodes, expandedIds, displayMode, layoutDir } = get();
    const node = rawNodes.find(n => n.id === id);
    if (!node) return;
    
    const siblings = rawNodes.filter(n => n.parent_id === node.parent_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = siblings.findIndex(n => n.id === id);
    
    if (idx !== -1 && idx < siblings.length - 1) {
      // Swap sort_order with the next sibling
      const next = siblings[idx + 1];
      const updates = [
        { id: node.id, sort_order: next.sort_order ?? 0 },
        { id: next.id, sort_order: node.sort_order ?? 0 }
      ];
      
      try {
        await api.reorderNodes(updates);
        const newNodes = rawNodes.map(n => {
          if (n.id === node.id) return { ...n, sort_order: updates[0].sort_order };
          if (n.id === next.id) return { ...n, sort_order: updates[1].sort_order };
          return n;
        }).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const { rfNodes, rfEdges } = reLayout(newNodes, expandedIds, displayMode, layoutDir);
        set({ rawNodes: newNodes, rfNodes, rfEdges });
      } catch (e) {
        set({ error: String(e) });
      }
    }
  },

  async reverseChildren(parentId: string) {
    const { rawNodes, expandedIds, displayMode, layoutDir } = get();
    const children = rawNodes.filter(n => n.parent_id === parentId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (children.length <= 1) return;

    // Collect the current sorted orders
    const orders = children.map(c => c.sort_order ?? 0);
    // Reverse the orders array
    orders.reverse();
    
    // Assign reversed orders back to children
    const updates = children.map((c, i) => ({ id: c.id, sort_order: orders[i] }));
    
    try {
      await api.reorderNodes(updates);
      // Apply locally
      const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
      const newNodes = rawNodes.map(n => {
        if (updateMap.has(n.id)) return { ...n, sort_order: updateMap.get(n.id) };
        return n;
      }).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const { rfNodes, rfEdges } = reLayout(newNodes, expandedIds, displayMode, layoutDir);
      set({ rawNodes: newNodes, rfNodes, rfEdges });
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

  async splitNode(nodeId, groupATitle, groupAContent, groupBTitle, groupBContent) {
    const { expandedIds, displayMode, layoutDir } = get();
    try {
      const result = await api.splitNode(nodeId, groupATitle, groupAContent, groupBTitle, groupBContent);
      // Backend returns the authoritative node list — use it directly
      const next = new Set(expandedIds);
      next.add(nodeId);           // keep the parent expanded
      next.add(result.groupA.id); // expand Group A
      next.add(result.groupB.id); // expand Group B
      const { rfNodes, rfEdges } = reLayout(result.nodes, next, displayMode, layoutDir);
      set({ rawNodes: result.nodes, expandedIds: next, rfNodes, rfEdges });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setFocusedNodeId(id) {
    const { rawNodes, expandedIds, displayMode, layoutDir } = get();
    // Snapshot IDs currently on screen before switching mode
    const prevIds = new Set(get().rfNodes.map((n) => n.id));
    
    // Ensure the focused node itself is expanded so we see its children
    const nextExpandedIds = new Set(expandedIds);
    if (id !== null) nextExpandedIds.add(id);

    set({ focusedNodeId: id, pendingFitView: true });
    setTimeout(() => {
      const { rfNodes: laid, rfEdges } = reLayout(rawNodes, nextExpandedIds, displayMode, layoutDir, id);

      if (id !== null) {
        // Entering focus mode — animate nodes that weren't visible before
        const newNodes = laid.filter((n) => !prevIds.has(n.id));
        newNodes.sort((a, b) =>
          layoutDir === 'LR' || layoutDir === 'RL'
            ? a.position.y - b.position.y
            : a.position.x - b.position.x
        );
        const staggerMap = new Map(newNodes.map((n, i) => [n.id, i]));
        const rfNodes = laid.map((n) =>
          prevIds.has(n.id)
            ? n
            : { ...n, data: { ...n.data, staggerIndex: staggerMap.get(n.id) ?? 0 } }
        );
        set({ expandedIds: nextExpandedIds, rfNodes, rfEdges, sequentialStep: 0 });
      } else {
        // Exiting focus mode — restore full map, no stagger (instant)
        set({ expandedIds: nextExpandedIds, rfNodes: laid, rfEdges });
      }
    }, 0);
  },

  setDetailPanelOpen(open) {
    set({ detailPanelOpen: open });
  },

  toggleDetailPanel() {
    set((s) => ({ detailPanelOpen: !s.detailPanelOpen }));
  },

  setClickOpensPanel(v) { localStorage.setItem('mm-click-opens-panel', String(v)); set({ clickOpensPanel: v }); },
  setMapLocked(v) { localStorage.setItem('mm-map-locked', String(v)); set({ mapLocked: v }); },
  setTheme(t) { _edgeColors = themes[t].edgeColors; localStorage.setItem('mm-theme', t); set({ theme: t }); },
  clearPendingFitView() { set({ pendingFitView: false }); },

  setAnimEntranceMode(mode) { localStorage.setItem('mm-anim-entrance', mode); set({ animEntranceMode: mode }); },
  setAnimStaggerMs(ms) { localStorage.setItem('mm-anim-stagger-ms', String(ms)); set({ animStaggerMs: ms }); },
  setAnimSpringDuration(s) { localStorage.setItem('mm-anim-spring-s', String(s)); set({ animSpringDuration: s }); },
  setTypewriterEnabled(v) { localStorage.setItem('mm-typewriter-enabled', String(v)); set({ typewriterEnabled: v }); },
  setTypewriterSpeedMs(ms) { localStorage.setItem('mm-typewriter-speed-ms', String(ms)); set({ typewriterSpeedMs: ms }); },
  setSequentialAutoPlay(v) { localStorage.setItem('mm-seq-auto', String(v)); set({ sequentialAutoPlay: v }); },
  setSequentialAutoDelayMs(ms) { localStorage.setItem('mm-seq-auto-delay-ms', String(ms)); set({ sequentialAutoDelayMs: ms }); },
}));
