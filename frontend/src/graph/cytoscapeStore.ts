import { create } from 'zustand';
import { api } from '../hooks/useApi';
import type { MindMapNodeData, ProjectWithNodes } from '../types/NodeTypes';
import { STATUS_CYCLE } from '../types/NodeTypes';
import type { ThemeKey } from '../theme/themes';
import { v4 as uuidv4 } from 'uuid';

export type GraphLayoutName = 'dagre' | 'cose' | 'breadthfirst' | 'circle' | 'grid' | 'manual';

export interface GraphSettings {
  layout_name: GraphLayoutName;
  positions: Record<string, { x: number; y: number }>;
  zoom: number;
  pan_x: number;
  pan_y: number;
}

interface GraphState {
  currentProject: ProjectWithNodes | null;
  rawNodes: MindMapNodeData[];
  loading: boolean;
  error: string | null;

  selectedNodeId: string | null;
  detailPanelOpen: boolean;

  layoutName: GraphLayoutName;
  savedPositions: Record<string, { x: number; y: number }>;
  zoom: number;
  panX: number;
  panY: number;

  theme: ThemeKey;

  loadProject: (id: string) => Promise<void>;
  setSelectedNodeId: (id: string | null) => void;
  setDetailPanelOpen: (v: boolean) => void;
  setLayoutName: (name: GraphLayoutName) => void;
  saveViewport: (zoom: number, panX: number, panY: number) => void;
  saveNodePositions: (positions: Record<string, { x: number; y: number }>) => void;

  cycleStatus: (id: string) => Promise<void>;
  updateNodeField: (id: string, patch: Partial<MindMapNodeData>) => Promise<void>;
  addChild: (parentId: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  setTheme: (t: ThemeKey) => void;
}

const graphApi = {
  getSettings(projectId: string): Promise<GraphSettings> {
    return fetch(`/api/graph/projects/${projectId}`)
      .then(r => r.ok ? r.json() : { layout_name: 'dagre', positions: {}, zoom: 1, pan_x: 0, pan_y: 0 });
  },
  saveSettings(projectId: string, settings: Partial<GraphSettings>): Promise<void> {
    return fetch(`/api/graph/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).then(() => {});
  },
  savePositions(projectId: string, positions: Record<string, { x: number; y: number }>): Promise<void> {
    return fetch(`/api/graph/projects/${projectId}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions }),
    }).then(() => {});
  },
};

export const useGraphStore = create<GraphState>((set, get) => ({
  currentProject: null,
  rawNodes: [],
  loading: false,
  error: null,

  selectedNodeId: null,
  detailPanelOpen: false,

  layoutName: 'dagre',
  savedPositions: {},
  zoom: 1,
  panX: 0,
  panY: 0,

  theme: (localStorage.getItem('mm-theme') as ThemeKey | null) ?? 'ibm',

  async loadProject(id) {
    set({ loading: true, error: null, selectedNodeId: null, detailPanelOpen: false });
    try {
      const [projectData, settings] = await Promise.all([
        api.getProjectWithNodes(id),
        graphApi.getSettings(id),
      ]);
      const { nodes, ...project } = projectData;
      set({
        currentProject: { ...project, nodes },
        rawNodes: nodes,
        layoutName: settings.layout_name ?? 'dagre',
        savedPositions: settings.positions ?? {},
        zoom: settings.zoom ?? 1,
        panX: settings.pan_x ?? 0,
        panY: settings.pan_y ?? 0,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setSelectedNodeId(id) { set({ selectedNodeId: id }); },
  setDetailPanelOpen(v) { set({ detailPanelOpen: v }); },

  setLayoutName(name) {
    set({ layoutName: name });
    const { currentProject } = get();
    if (currentProject) {
      graphApi.saveSettings(currentProject.id, { layout_name: name }).catch(() => {});
    }
  },

  saveViewport(zoom, panX, panY) {
    set({ zoom, panX, panY });
    const { currentProject } = get();
    if (currentProject) {
      graphApi.saveSettings(currentProject.id, { zoom, pan_x: panX, pan_y: panY }).catch(() => {});
    }
  },

  saveNodePositions(positions) {
    set({ savedPositions: positions });
    const { currentProject } = get();
    if (currentProject) {
      graphApi.savePositions(currentProject.id, positions).catch(() => {});
    }
  },

  async cycleStatus(id) {
    const { rawNodes } = get();
    const node = rawNodes.find(n => n.id === id);
    if (!node) return;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % STATUS_CYCLE.length];
    try {
      await api.updateNode(id, { status: next });
      set({ rawNodes: rawNodes.map(n => n.id === id ? { ...n, status: next } : n) });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async updateNodeField(id, patch) {
    const { rawNodes } = get();
    try {
      await api.updateNode(id, patch);
      set({ rawNodes: rawNodes.map(n => n.id === id ? { ...n, ...patch } : n) });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async addChild(parentId) {
    const { rawNodes, currentProject } = get();
    if (!currentProject) return;
    const parent = rawNodes.find(n => n.id === parentId);
    const newNode = {
      id: uuidv4(),
      project_id: currentProject.id,
      parent_id: parentId,
      title: 'New node',
      content: '',
      status: 'pending' as const,
      priority: 'medium' as const,
      sort_order: rawNodes.filter(n => n.parent_id === parentId).length,
      depth_level: (parent?.depth_level ?? 0) + 1,
    };
    try {
      const created = await api.createNode(newNode);
      set({ rawNodes: [...rawNodes, created] });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async deleteNode(id) {
    const { rawNodes } = get();
    const toRemove = new Set<string>();
    const collect = (nid: string) => {
      toRemove.add(nid);
      rawNodes.filter(n => n.parent_id === nid).forEach(c => collect(c.id));
    };
    collect(id);
    try {
      await api.deleteNode(id);
      set({
        rawNodes: rawNodes.filter(n => !toRemove.has(n.id)),
        selectedNodeId: toRemove.has(get().selectedNodeId ?? '') ? null : get().selectedNodeId,
        detailPanelOpen: toRemove.has(get().selectedNodeId ?? '') ? false : get().detailPanelOpen,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setTheme(t) {
    localStorage.setItem('mm-theme', t);
    set({ theme: t });
  },
}));
