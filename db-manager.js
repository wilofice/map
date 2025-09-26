const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = './mind_maps.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.init();
    }

    init() {
        try {
            // Create database connection
            this.db = new Database(this.dbPath);
            
            // Enable foreign key constraints
            this.db.pragma('foreign_keys = ON');

            // Set UTF-8 encoding
            this.db.pragma('encoding = "UTF-8"');
            
            // Create tables if they don't exist
            this.createTables();
            
            // Prepare statements for better performance
            this.prepareStatements();
            
            console.log(`✅ Database initialized: ${this.dbPath}`);
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    createTables() {
        const schemaPath = path.join(__dirname, 'database-schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            this.db.exec(schema);
        } else {
            // Fallback schema if file doesn't exist
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS collections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    file_path TEXT,
                    collection_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_opened DATETIME,
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
                );

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

                CREATE TABLE IF NOT EXISTS app_state (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_nodes_project_id ON nodes(project_id);
                CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
                CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
                CREATE INDEX IF NOT EXISTS idx_projects_last_opened ON projects(last_opened DESC);
            `);
        }
    }

    prepareStatements() {
        // Project operations
        this.stmts = {
            // Collections
            insertCollection: this.db.prepare(`
                INSERT INTO collections (id, name, description)
                VALUES (?, ?, ?)
            `),
            getCollection: this.db.prepare(`
                SELECT * FROM collections WHERE id = ?
            `),
            getAllCollections: this.db.prepare(`
                SELECT c.*,
                       COUNT(p.id) as project_count
                FROM collections c
                LEFT JOIN projects p ON c.id = p.collection_id
                GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
                ORDER BY c.updated_at DESC
            `),
            updateCollection: this.db.prepare(`
                UPDATE collections SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `),
            deleteCollection: this.db.prepare(`
                DELETE FROM collections WHERE id = ?
            `),
            getCollectionProjects: this.db.prepare(`
                SELECT p.*,
                       COUNT(n.id) as node_count
                FROM projects p
                LEFT JOIN nodes n ON p.id = n.project_id
                WHERE p.collection_id = ?
                GROUP BY p.id, p.name, p.description, p.file_path, p.collection_id, p.created_at, p.updated_at, p.last_opened
                ORDER BY p.last_opened DESC
            `),

            // Projects
            insertProject: this.db.prepare(`
                INSERT INTO projects (id, name, description, file_path, collection_id, last_opened)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `),
            getProject: this.db.prepare(`
                SELECT * FROM projects WHERE id = ?
            `),
            getAllProjects: this.db.prepare(`
                SELECT p.*,
                       COUNT(n.id) as node_count,
                       c.name as collection_name
                FROM projects p
                LEFT JOIN nodes n ON p.id = n.project_id
                LEFT JOIN collections c ON p.collection_id = c.id
                GROUP BY p.id, p.name, p.description, p.file_path, p.collection_id, p.created_at, p.updated_at, p.last_opened, c.name
                ORDER BY p.last_opened DESC
            `),
            updateProjectLastOpened: this.db.prepare(`
                UPDATE projects SET last_opened = CURRENT_TIMESTAMP WHERE id = ?
            `),
            updateProject: this.db.prepare(`
                UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `),
            deleteProject: this.db.prepare(`
                DELETE FROM projects WHERE id = ?
            `),

            // Nodes
            insertNode: this.db.prepare(`
                INSERT INTO nodes (
                    id, project_id, parent_id, title, content, status, priority,
                    start_date, end_date, days_spent, code_language, code_content,
                    task_prompt, cli_command, sort_order, depth_level
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),
            getNode: this.db.prepare(`
                SELECT * FROM nodes WHERE id = ?
            `),
            getProjectNodes: this.db.prepare(`
                SELECT * FROM nodes WHERE project_id = ? ORDER BY sort_order
            `),
            getChildNodes: this.db.prepare(`
                SELECT * FROM nodes WHERE parent_id = ? ORDER BY sort_order
            `),
            updateNode: this.db.prepare(`
                UPDATE nodes SET 
                    title = ?, content = ?, status = ?, priority = ?,
                    start_date = ?, end_date = ?, days_spent = ?,
                    code_language = ?, code_content = ?, task_prompt = ?, cli_command = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `),
            deleteNode: this.db.prepare(`
                DELETE FROM nodes WHERE id = ?
            `),
            searchNodes: this.db.prepare(`
                SELECT n.*, p.name as project_name 
                FROM nodes n 
                JOIN projects p ON n.project_id = p.id 
                WHERE n.title LIKE ? OR n.content LIKE ?
                ORDER BY n.updated_at DESC
            `),

            // App State
            setAppState: this.db.prepare(`
                INSERT OR REPLACE INTO app_state (key, value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `),
            getAppState: this.db.prepare(`
                SELECT value FROM app_state WHERE key = ?
            `)
        };
    }

    // Project Operations
    createProject(id, name, description = '', filePath = '') {
        try {
            this.stmts.insertProject.run(id, name, description, filePath);
            return { id, name, description, filePath };
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    getProject(id) {
        try {
            return this.stmts.getProject.get(id);
        } catch (error) {
            console.error('Error getting project:', error);
            throw error;
        }
    }

    getAllProjects() {
        try {
            return this.stmts.getAllProjects.all();
        } catch (error) {
            console.error('Error getting all projects:', error);
            throw error;
        }
    }

    updateProjectLastOpened(id) {
        try {
            this.stmts.updateProjectLastOpened.run(id);
        } catch (error) {
            console.error('Error updating project last opened:', error);
        }
    }

    updateProject(id, updates) {
        try {
            const { name, description } = updates;
            this.stmts.updateProject.run(name, description, id);

            // Return the updated project
            return this.getProject(id);
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    }

    deleteProject(id) {
        try {
            this.stmts.deleteProject.run(id);
            return { success: true };
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    searchProjects(query) {
        try {
            const searchQuery = `%${query}%`;
            const searchStmt = this.db.prepare(`
                SELECT p.*,
                       COUNT(n.id) as node_count
                FROM projects p
                LEFT JOIN nodes n ON p.id = n.project_id
                WHERE p.name LIKE ? OR p.description LIKE ?
                GROUP BY p.id, p.name, p.description, p.file_path, p.created_at, p.updated_at, p.last_opened
                ORDER BY p.last_opened DESC
            `);
            return searchStmt.all(searchQuery, searchQuery);
        } catch (error) {
            console.error('Error searching projects:', error);
            throw error;
        }
    }

    // Node Operations
    createNode(nodeData) {
        try {
            const {
                id, project_id, parent_id = null, title, content = '', 
                status = 'pending', priority = 'medium',
                start_date = null, end_date = null, days_spent = 0,
                code_language = null, code_content = null,
                task_prompt = null, cli_command = null,
                sort_order = 0, depth_level = 0
            } = nodeData;

            this.stmts.insertNode.run(
                id, project_id, parent_id, title, content, status, priority,
                start_date, end_date, days_spent, code_language, code_content,
                task_prompt, cli_command, sort_order, depth_level
            );

            return this.getNode(id);
        } catch (error) {
            console.error('Error creating node:', error);
            throw error;
        }
    }

    getNode(id) {
        try {
            return this.stmts.getNode.get(id);
        } catch (error) {
            console.error('Error getting node:', error);
            throw error;
        }
    }

    getProjectNodes(projectId) {
        try {
            return this.stmts.getProjectNodes.all(projectId);
        } catch (error) {
            console.error('Error getting project nodes:', error);
            throw error;
        }
    }

    getProjectWithNodes(projectId) {
        try {
            const project = this.getProject(projectId);
            if (!project) return null;

            const nodes = this.getProjectNodes(projectId);
            
            // Update last opened timestamp
            this.updateProjectLastOpened(projectId);
            
            return { ...project, nodes };
        } catch (error) {
            console.error('Error getting project with nodes:', error);
            throw error;
        }
    }

    updateNode(id, updates) {
        try {
            const node = this.getNode(id);
            if (!node) throw new Error(`Node ${id} not found`);

            const {
                title = node.title,
                content = node.content,
                status = node.status,
                priority = node.priority,
                start_date = node.start_date,
                end_date = node.end_date,
                days_spent = node.days_spent,
                code_language = node.code_language,
                code_content = node.code_content,
                task_prompt = node.task_prompt,
                cli_command = node.cli_command
            } = updates;

            this.stmts.updateNode.run(
                title, content, status, priority,
                start_date, end_date, days_spent,
                code_language, code_content, task_prompt, cli_command,
                id
            );

            return this.getNode(id);
        } catch (error) {
            console.error('Error updating node:', error);
            throw error;
        }
    }

    deleteNode(id) {
        try {
            this.stmts.deleteNode.run(id);
            return { success: true };
        } catch (error) {
            console.error('Error deleting node:', error);
            throw error;
        }
    }

    // Search Operations
    searchNodes(query) {
        try {
            const searchTerm = `%${query}%`;
            return this.stmts.searchNodes.all(searchTerm, searchTerm);
        } catch (error) {
            console.error('Error searching nodes:', error);
            throw error;
        }
    }

    // App State Operations
    saveAppState(key, value) {
        try {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            this.stmts.setAppState.run(key, valueStr);
        } catch (error) {
            console.error('Error saving app state:', error);
            throw error;
        }
    }

    getAppState(key, defaultValue = null) {
        try {
            const result = this.stmts.getAppState.get(key);
            if (!result) return defaultValue;
            
            try {
                return JSON.parse(result.value);
            } catch {
                return result.value;
            }
        } catch (error) {
            console.error('Error getting app state:', error);
            return defaultValue;
        }
    }

    // Utility Operations
    getStats() {
        try {
            const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
            const nodeCount = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get().count;
            const dbSize = fs.statSync(this.dbPath).size;

            return {
                projects: projectCount,
                nodes: nodeCount,
                databaseSize: dbSize,
                databasePath: this.dbPath
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }

    // Backup & Export
    backup(backupPath) {
        try {
            this.db.backup(backupPath);
            return { success: true, backupPath };
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    close() {
        if (this.db) {
            this.db.close();
            console.log('✅ Database connection closed');
        }
    }
}

module.exports = DatabaseManager;
