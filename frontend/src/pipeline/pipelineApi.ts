async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json', ...opts?.headers }, ...opts });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  const txt = await res.text();
  return (txt ? JSON.parse(txt) : undefined) as T;
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
  getTasks: (collectionId?: string) =>
    req<PipelineTask[]>(`/api/pipeline/tasks${collectionId ? `?collection_id=${collectionId}` : ''}`),
  getTask: (id: string) => req<PipelineTaskDetail>(`/api/pipeline/tasks/${id}`),
  createTask: (data: Partial<PipelineTask>) =>
    req<PipelineTaskDetail>('/api/pipeline/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, patch: Partial<PipelineTask>) =>
    req<PipelineTaskDetail>(`/api/pipeline/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteTask: (id: string) => req<void>(`/api/pipeline/tasks/${id}`, { method: 'DELETE' }),

  // Nodes
  createNode: (data: { task_id: string; title: string; description?: string; type?: string; sort_order?: number; position_x?: number; position_y?: number }) =>
    req<PipelineNode>('/api/pipeline/nodes', { method: 'POST', body: JSON.stringify(data) }),
  updateNode: (id: string, patch: Partial<PipelineNode>) =>
    req<PipelineNode>(`/api/pipeline/nodes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteNode: (id: string) => req<void>(`/api/pipeline/nodes/${id}`, { method: 'DELETE' }),

  // Edges
  createEdge: (data: { task_id: string; source_id: string; target_id: string; label?: string }) =>
    req<PipelineEdge>('/api/pipeline/edges', { method: 'POST', body: JSON.stringify(data) }),
  deleteEdge: (id: string) => req<void>(`/api/pipeline/edges/${id}`, { method: 'DELETE' }),
};
