import type { Collection, MindMapNodeData, Project, ProjectWithNodes } from '../types/NodeTypes';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  // Handle empty bodies (204 No Content, etc.)
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  getProjects(): Promise<Project[]> {
    return request('/api/db/projects');
  },

  getCollections(): Promise<Collection[]> {
    return request('/api/db/collections');
  },

  getProjectWithNodes(id: string): Promise<ProjectWithNodes> {
    return request(`/api/db/projects/${id}`);
  },

  updateNode(id: string, patch: Partial<MindMapNodeData>): Promise<MindMapNodeData> {
    return request(`/api/db/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  createNode(data: Partial<MindMapNodeData> & { project_id: string; title: string }): Promise<MindMapNodeData> {
    return request('/api/db/nodes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteNode(id: string): Promise<void> {
    return request(`/api/db/nodes/${id}`, { method: 'DELETE' });
  },

  selectProject(id: string): Promise<void> {
    return request(`/api/db/projects/${id}/select`, { method: 'POST' });
  },

  getLastProject(): Promise<{ project_id: string } | null> {
    return request('/api/db/last-project');
  },
};
