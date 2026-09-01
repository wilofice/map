import { create } from 'zustand';
import { pipelineApi } from './pipelineApi';
import type { PipelineCollection, PipelineTask, PipelineTaskDetail, PipelineNode } from './pipelineApi';

interface PipelineState {
  collections: PipelineCollection[];
  tasks: PipelineTask[];
  currentTask: PipelineTaskDetail | null;
  selectedCollectionId: string | null;
  selectedNodeId: string | null;
  panelOpen: boolean;
  loading: boolean;
  graphLoading: boolean;
  error: string | null;

  // Collections
  loadCollections: () => Promise<void>;
  createCollection: (name: string, description?: string, color?: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  // Tasks
  loadTasks: (collectionId?: string) => Promise<void>;
  createTask: (data: Partial<PipelineTask>) => Promise<PipelineTaskDetail>;
  updateTask: (id: string, patch: Partial<PipelineTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Graph
  loadTask: (id: string) => Promise<void>;
  createNode: (title: string, posX?: number, posY?: number) => Promise<PipelineNode | null>;
  updateNode: (id: string, patch: Partial<PipelineNode>) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  createEdge: (sourceId: string, targetId: string) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;

  // UI
  setSelectedCollectionId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setPanelOpen: (v: boolean) => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  collections: [],
  tasks: [],
  currentTask: null,
  selectedCollectionId: null,
  selectedNodeId: null,
  panelOpen: false,
  loading: false,
  graphLoading: false,
  error: null,

  async loadCollections() {
    try {
      const collections = await pipelineApi.getCollections();
      set({ collections });
    } catch (e) { set({ error: String(e) }); }
  },

  async createCollection(name, description, color) {
    try {
      const c = await pipelineApi.createCollection(name, description, color);
      set(s => ({ collections: [...s.collections, c] }));
    } catch (e) { set({ error: String(e) }); }
  },

  async deleteCollection(id) {
    try {
      await pipelineApi.deleteCollection(id);
      set(s => ({ collections: s.collections.filter(c => c.id !== id) }));
    } catch (e) { set({ error: String(e) }); }
  },

  async loadTasks(collectionId) {
    set({ loading: true, error: null });
    try {
      const [tasks, collections] = await Promise.all([
        pipelineApi.getTasks(collectionId),
        pipelineApi.getCollections(),
      ]);
      set({ tasks, collections, loading: false });
    } catch (e) { set({ error: String(e), loading: false }); }
  },

  async createTask(data) {
    const task = await pipelineApi.createTask(data);
    set(s => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  async updateTask(id, patch) {
    try {
      const updated = await pipelineApi.updateTask(id, patch);
      set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...updated } : t),
        currentTask: s.currentTask?.id === id ? { ...s.currentTask, ...updated } : s.currentTask,
      }));
    } catch (e) { set({ error: String(e) }); }
  },

  async deleteTask(id) {
    try {
      await pipelineApi.deleteTask(id);
      set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
    } catch (e) { set({ error: String(e) }); }
  },

  async loadTask(id) {
    set({ graphLoading: true, error: null, selectedNodeId: null, panelOpen: false });
    try {
      const task = await pipelineApi.getTask(id);
      set({ currentTask: task, graphLoading: false });
    } catch (e) { set({ error: String(e), graphLoading: false }); }
  },

  async createNode(title, posX = 100, posY = 100) {
    const { currentTask } = get();
    if (!currentTask) return null;
    try {
      const node = await pipelineApi.createNode({
        task_id: currentTask.id,
        title,
        sort_order: currentTask.nodes.length,
        position_x: posX,
        position_y: posY,
      });
      set(s => s.currentTask ? { currentTask: { ...s.currentTask, nodes: [...s.currentTask.nodes, node] } } : {});
      return node;
    } catch (e) { set({ error: String(e) }); return null; }
  },

  async updateNode(id, patch) {
    try {
      const updated = await pipelineApi.updateNode(id, patch);
      set(s => {
        if (!s.currentTask) return {};
        return {
          currentTask: {
            ...s.currentTask,
            nodes: s.currentTask.nodes.map(n => n.id === id ? { ...n, ...updated } : n),
          },
        };
      });
    } catch (e) { set({ error: String(e) }); }
  },

  async deleteNode(id) {
    try {
      await pipelineApi.deleteNode(id);
      set(s => {
        if (!s.currentTask) return {};
        return {
          currentTask: {
            ...s.currentTask,
            nodes: s.currentTask.nodes.filter(n => n.id !== id),
            edges: s.currentTask.edges.filter(e => e.source_id !== id && e.target_id !== id),
          },
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
          panelOpen: s.selectedNodeId === id ? false : s.panelOpen,
        };
      });
    } catch (e) { set({ error: String(e) }); }
  },

  async createEdge(sourceId, targetId) {
    const { currentTask } = get();
    if (!currentTask) return;
    // Prevent duplicate edges
    const exists = currentTask.edges.find(e => e.source_id === sourceId && e.target_id === targetId);
    if (exists) return;
    try {
      const edge = await pipelineApi.createEdge({ task_id: currentTask.id, source_id: sourceId, target_id: targetId });
      set(s => s.currentTask ? { currentTask: { ...s.currentTask, edges: [...s.currentTask.edges, edge] } } : {});
    } catch (e) { set({ error: String(e) }); }
  },

  async deleteEdge(id) {
    try {
      await pipelineApi.deleteEdge(id);
      set(s => s.currentTask ? { currentTask: { ...s.currentTask, edges: s.currentTask.edges.filter(e => e.id !== id) } } : {});
    } catch (e) { set({ error: String(e) }); }
  },

  setSelectedCollectionId: (id) => set({ selectedCollectionId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setPanelOpen: (v) => set({ panelOpen: v }),
}));
