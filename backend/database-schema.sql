-- SQLite Schema for Mind Map Application
-- Optimized for single-user, local usage with portability

-- Collections table (must come before projects due to FK)
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    collection_id TEXT,
    layout_dir TEXT DEFAULT 'LR',
    display_mode TEXT DEFAULT 'comfortable',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_opened DATETIME,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
);

-- Nodes table - optimized for hierarchical data and fast updates
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    days_spent INTEGER DEFAULT 0,
    code_language TEXT,
    code_content TEXT,
    task_prompt TEXT,
    cli_command TEXT,
    sort_order INTEGER DEFAULT 0,
    depth_level INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Application state table
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Node progress log (AI agent step messages)
CREATE TABLE IF NOT EXISTS node_progress (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    agent_type TEXT DEFAULT 'ai',
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Project activity log
CREATE TABLE IF NOT EXISTS project_activity (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    activity_data TEXT NOT NULL,
    node_id TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Audio file attachments per node (files stored on disk, metadata here)
CREATE TABLE IF NOT EXISTS node_audio_files (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_project_id ON nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
CREATE INDEX IF NOT EXISTS idx_nodes_priority ON nodes(priority);
CREATE INDEX IF NOT EXISTS idx_projects_last_opened ON projects(last_opened DESC);
CREATE INDEX IF NOT EXISTS idx_audio_files_node_id ON node_audio_files(node_id);
CREATE INDEX IF NOT EXISTS idx_node_progress_node_id ON node_progress(node_id);
CREATE INDEX IF NOT EXISTS idx_node_progress_created_at ON node_progress(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON project_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_type ON project_activity(activity_type);

-- Initial app state entries
INSERT OR IGNORE INTO app_state (key, value) VALUES
    ('last_opened_project', NULL),
    ('ui_comments_visible', 'false'),
    ('ui_dates_visible', 'false'),
    ('ui_add_buttons_visible', 'true'),
    ('working_directory', '.');

-- Triggers to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
    AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_nodes_timestamp
    AFTER UPDATE ON nodes
BEGIN
    UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_collections_timestamp
    AFTER UPDATE ON collections
BEGIN
    UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
