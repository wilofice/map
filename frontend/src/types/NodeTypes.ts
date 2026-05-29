export type NodeStatus = 'pending' | 'in-progress' | 'completed';
export type NodePriority = 'low' | 'medium' | 'high';

export interface MindMapNodeData {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  content?: string;
  status: NodeStatus;
  priority: NodePriority;
  start_date?: string;
  end_date?: string;
  days_spent?: number;
  code_language?: string;
  code_content?: string;
  task_prompt?: string;
  cli_command?: string;
  sort_order: number;
  depth_level: number;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  file_path?: string;
  collection_id?: string;
  created_at?: string;
  updated_at?: string;
  last_opened?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
}

// The server returns { ...projectFields, nodes } (flat object, not nested)
export type ProjectWithNodes = Project & { nodes: MindMapNodeData[];
}

export const STATUS_CYCLE: NodeStatus[] = ['pending', 'in-progress', 'completed'];
export const STATUS_ICON: Record<NodeStatus, string> = {
  pending: '⏳',
  'in-progress': '🔄',
  completed: '✅',
};
export const PRIORITY_COLOR: Record<NodePriority, string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#f87171',
};
