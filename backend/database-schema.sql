-- SQLite Schema for Mind Map Application
-- Optimized for single-user, local usage with portability

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT, -- Original file path for reference
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_opened DATETIME
);

-- Nodes table - optimized for hierarchical data and fast updates
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_id TEXT, -- NULL for root nodes
    title TEXT NOT NULL,
    content TEXT, -- Comments, notes, etc.
    status TEXT DEFAULT 'pending', -- pending, in-progress, completed
    priority TEXT DEFAULT 'medium', -- low, medium, high
    
    -- Dates
    start_date DATE,
    end_date DATE,
    days_spent INTEGER DEFAULT 0,
    
    -- Advanced content
    code_language TEXT,
    code_content TEXT,
    task_prompt TEXT,
    cli_command TEXT,
    
    -- Positioning and hierarchy
    sort_order INTEGER DEFAULT 0, -- For maintaining order within parent
    depth_level INTEGER DEFAULT 0, -- For quick depth queries
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Application state table - for remembering last opened project, UI settings, etc.
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_project_id ON nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
CREATE INDEX IF NOT EXISTS idx_nodes_priority ON nodes(priority);
CREATE INDEX IF NOT EXISTS idx_projects_last_opened ON projects(last_opened DESC);

-- Initial app state entries
INSERT OR IGNORE INTO app_state (key, value) VALUES 
    ('last_opened_project', NULL),
    ('ui_comments_visible', 'false'),
    ('ui_dates_visible', 'false'),
    ('ui_add_buttons_visible', 'true'),
    ('working_directory', '.');

-- Trigger to update updated_at timestamp
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
