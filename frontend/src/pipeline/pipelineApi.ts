async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json', ...opts?.headers }, ...opts });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  const txt = await res.text();
  return (txt ? JSON.parse(txt) : undefined) as T;
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(path, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface PipelineCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
}

export interface PipelineTask {
  id: string;
  collection_id: string | null;
  name: string;
  description: string;
  type: 'general' | 'code' | 'video' | 'design' | 'research' | 'review';
  status: 'pending' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  node_count?: number;
  done_count?: number;
  created_at: string;
}

export interface PipelineNode {
  id: string;
  task_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done';
  type: 'step' | 'decision' | 'milestone' | 'review';
  notes: string;
  cli_command: string;
  due_date: string | null;
  image_url: string | null;
  position_x: number;
  position_y: number;
  sort_order: number;
  created_at: string;
}

export interface PipelineEdge {
  id: string;
  task_id: string;
  source_id: string;
  target_id: string;
  label: string;
}

export interface PipelineTaskDetail extends PipelineTask {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export const pipelineApi = {
  // Collections
  getCollections: () => req<PipelineCollection[]>('/api/pipeline/collections'),
  createCollection: (name: string, description?: string, color?: string) =>
    req<PipelineCollection>('/api/pipeline/collections', { method: 'POST', body: JSON.stringify({ name, description, color }) }),
  updateCollection: (id: string, patch: Partial<PipelineCollection>) =>
    req<PipelineCollection>(`/api/pipeline/collections/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteCollection: (id: string) =>
    req<void>(`/api/pipeline/collections/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (collectionId?: string, archived = false) => {
    const params = new URLSearchParams();
    if (collectionId) params.set('collection_id', collectionId);
    if (archived) params.set('archived', '1');
    const qs = params.toString();
    return req<PipelineTask[]>(`/api/pipeline/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id: string) => req<PipelineTaskDetail>(`/api/pipeline/tasks/${id}`),
  createTask: (data: Partial<PipelineTask>) =>
    req<PipelineTaskDetail>('/api/pipeline/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, patch: Partial<PipelineTask>) =>
    req<PipelineTaskDetail>(`/api/pipeline/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteTask: (id: string) => req<void>(`/api/pipeline/tasks/${id}`, { method: 'DELETE' }),
  archiveTask: (id: string, archived: boolean) =>
    req<PipelineTask>(`/api/pipeline/tasks/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archived }) }),

  // Nodes
  createNode: (data: { task_id: string; title: string; description?: string; type?: string; sort_order?: number; position_x?: number; position_y?: number }) =>
    req<PipelineNode>('/api/pipeline/nodes', { method: 'POST', body: JSON.stringify(data) }),
  updateNode: (id: string, patch: Partial<PipelineNode>) =>
    req<PipelineNode>(`/api/pipeline/nodes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteNode: (id: string) => req<void>(`/api/pipeline/nodes/${id}`, { method: 'DELETE' }),
  uploadNodeImage: (id: string, file: File) => {
    const fd = new FormData(); fd.append('image', file);
    return upload<PipelineNode>(`/api/pipeline/nodes/${id}/image`, fd);
  },
  setNodeImageUrl: (id: string, image_url: string) =>
    req<PipelineNode>(`/api/pipeline/nodes/${id}/image`, { method: 'PUT', body: JSON.stringify({ image_url }) }),
  removeNodeImage: (id: string) =>
    req<PipelineNode>(`/api/pipeline/nodes/${id}/image`, { method: 'DELETE' }),

  // Edges
  createEdge: (data: { task_id: string; source_id: string; target_id: string; label?: string }) =>
    req<PipelineEdge>('/api/pipeline/edges', { method: 'POST', body: JSON.stringify(data) }),
  deleteEdge: (id: string) => req<void>(`/api/pipeline/edges/${id}`, { method: 'DELETE' }),
};
