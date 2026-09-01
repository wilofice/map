const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, '..', 'mind_maps.db');
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

            // Run incremental migrations (idempotent)
            this.runMigrations();

            // Prepare statements for better performance
            this.prepareStatements();

            // Ensure Default collection exists
            this.ensureDefaultCollection();
            
            console.error(`✅ Database initialized: ${this.dbPath}`);
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
                    color TEXT,
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

                CREATE TABLE IF NOT EXISTS node_progress (
                    id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    agent_type TEXT DEFAULT 'ai',
                    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
                );

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

                CREATE INDEX IF NOT EXISTS idx_nodes_project_id ON nodes(project_id);
                CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);
                CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
                CREATE INDEX IF NOT EXISTS idx_projects_last_opened ON projects(last_opened DESC);
                CREATE INDEX IF NOT EXISTS idx_node_progress_node_id ON node_progress(node_id);
                CREATE INDEX IF NOT EXISTS idx_node_progress_created_at ON node_progress(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON project_activity(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON project_activity(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_project_activity_type ON project_activity(activity_type);
            `);
        }
    }

    runMigrations() {
        const addCol = (sql) => { try { this.db.exec(sql); } catch (_) {} };
        addCol("ALTER TABLE projects ADD COLUMN layout_dir TEXT DEFAULT 'LR'");
        addCol("ALTER TABLE projects ADD COLUMN display_mode TEXT DEFAULT 'comfortable'");
        addCol("ALTER TABLE collections ADD COLUMN color TEXT");

        // Pipeline task management tables
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS pipeline_collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                color TEXT DEFAULT '#6366f1',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS pipeline_tasks (
                id TEXT PRIMARY KEY,
                collection_id TEXT,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                type TEXT DEFAULT 'general',
                status TEXT DEFAULT 'pending',
                priority TEXT DEFAULT 'medium',
                due_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (collection_id) REFERENCES pipeline_collections(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS pipeline_nodes (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                status TEXT DEFAULT 'pending',
                type TEXT DEFAULT 'step',
                notes TEXT DEFAULT '',
                cli_command TEXT DEFAULT '',
                due_date DATE,
                position_x REAL DEFAULT 0,
                position_y REAL DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES pipeline_tasks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS pipeline_edges (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                label TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES pipeline_tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (source_id) REFERENCES pipeline_nodes(id) ON DELETE CASCADE,
                FOREIGN KEY (target_id) REFERENCES pipeline_nodes(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_pipeline_tasks_collection ON pipeline_tasks(collection_id);
            CREATE INDEX IF NOT EXISTS idx_pipeline_nodes_task ON pipeline_nodes(task_id);
            CREATE INDEX IF NOT EXISTS idx_pipeline_edges_task ON pipeline_edges(task_id);
            CREATE INDEX IF NOT EXISTS idx_pipeline_edges_source ON pipeline_edges(source_id);
            CREATE INDEX IF NOT EXISTS idx_pipeline_edges_target ON pipeline_edges(target_id);
        `);

        // Graph view settings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS graph_settings (
                project_id TEXT PRIMARY KEY,
                layout_name TEXT NOT NULL DEFAULT 'dagre',
                positions TEXT NOT NULL DEFAULT '{}',
                zoom REAL NOT NULL DEFAULT 1,
                pan_x REAL NOT NULL DEFAULT 0,
                pan_y REAL NOT NULL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_graph_settings_project ON graph_settings(project_id);
        `);
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
                UPDATE collections SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color), updated_at = CURRENT_TIMESTAMP WHERE id = ?
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
                       SUM(CASE WHEN n.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
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
                UPDATE projects SET
                    name = COALESCE(?, name),
                    description = COALESCE(?, description),
                    collection_id = CASE WHEN ? IS NOT NULL THEN ? ELSE collection_id END,
                    layout_dir = COALESCE(?, layout_dir),
                    display_mode = COALESCE(?, display_mode),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
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
                    sort_order = ?, updated_at = CURRENT_TIMESTAMP
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
            `),

            // Node Progress
            insertNodeProgress: this.db.prepare(`
                INSERT INTO node_progress (id, node_id, message, agent_type)
                VALUES (?, ?, ?, ?)
            `),
            getNodeProgress: this.db.prepare(`
                SELECT * FROM node_progress WHERE node_id = ? ORDER BY created_at DESC
            `),
            deleteNodeProgress: this.db.prepare(`
                DELETE FROM node_progress WHERE node_id = ?
            `),

            // Project Activity
            insertProjectActivity: this.db.prepare(`
                INSERT INTO project_activity (id, project_id, activity_type, activity_data, node_id, user_agent, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `),
            getProjectActivity: this.db.prepare(`
                SELECT pa.*,
                       n.title as node_title,
                       p.name as project_name
                FROM project_activity pa
                LEFT JOIN nodes n ON pa.node_id = n.id
                LEFT JOIN projects p ON pa.project_id = p.id
                WHERE pa.project_id = ?
                ORDER BY pa.created_at DESC
                LIMIT ? OFFSET ?
            `),
            getProjectActivityCount: this.db.prepare(`
                SELECT COUNT(*) as count FROM project_activity WHERE project_id = ?
            `),
            deleteProjectActivity: this.db.prepare(`
                DELETE FROM project_activity WHERE project_id = ?
            `),

            // Audio file attachments
            getNodeAudio: this.db.prepare(`
                SELECT * FROM node_audio_files WHERE node_id = ? ORDER BY created_at ASC
            `),
            getAudioById: this.db.prepare(`
                SELECT * FROM node_audio_files WHERE id = ?
            `),
            insertAudio: this.db.prepare(`
                INSERT INTO node_audio_files (id, node_id, project_id, original_filename, stored_filename, file_path, file_size, mime_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `),
            deleteAudio: this.db.prepare(`
                DELETE FROM node_audio_files WHERE id = ?
            `)
        };
    }

    ensureDefaultCollection() {
        try {
            const { v4: uuidv4 } = require('uuid');
            const defaultId = 'default-collection';

            // Check if Default collection already exists
            const existing = this.stmts.getCollection.get(defaultId);

            if (!existing) {
                // Create Default collection
                this.stmts.insertCollection.run(defaultId, 'Default', 'Default collection for imported projects');
                console.error('✅ Created Default collection');
            } else {
                console.error('✅ Default collection already exists');
            }
        } catch (error) {
            console.error('❌ Error ensuring Default collection:', error);
        }
    }

    // Collection Operations
    createCollection(id, name, description = '') {
        try {
            this.stmts.insertCollection.run(id, name, description);
            return { id, name, description };
        } catch (error) {
            console.error('Error creating collection:', error);
            throw error;
        }
    }

    getCollection(id) {
        try {
            return this.stmts.getCollection.get(id);
        } catch (error) {
            console.error('Error getting collection:', error);
            throw error;
        }
    }

    getAllCollections() {
        try {
            return this.stmts.getAllCollections.all();
        } catch (error) {
            console.error('Error getting all collections:', error);
            throw error;
        }
    }

    updateCollection(id, updates) {
        const { name = null, description = null, color = null } = updates;
        try {
            this.stmts.updateCollection.run(name, description, color, id);
            return this.getCollection(id);
        } catch (error) {
            console.error('Error updating collection:', error);
            throw error;
        }
    }

    deleteCollection(id) {
        try {
            // Delete all projects in this collection (nodes are deleted via FK ON DELETE CASCADE)
            const tx = this.db.transaction((collectionId) => {
                const projects = this.stmts.getCollectionProjects.all(collectionId);
                for (const project of projects) {
                    this.stmts.deleteProject.run(project.id);
                }
                this.stmts.deleteCollection.run(collectionId);
                return projects.length;
            });

            const projectsDeleted = tx(id);
            return { success: true, projectsDeleted };
        } catch (error) {
            console.error('Error deleting collection:', error);
            throw error;
        }
    }

    getCollectionProjects(collectionId) {
        try {
            return this.stmts.getCollectionProjects.all(collectionId);
        } catch (error) {
            console.error('Error getting collection projects:', error);
            throw error;
        }
    }

    // Project Operations
    createProject(id, name, description = '', filePath = '', collectionId = null) {
        try {
            this.stmts.insertProject.run(id, name, description, filePath, collectionId);
            return { id, name, description, filePath, collection_id: collectionId };
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
            const { name, description, collection_id, layout_dir, display_mode } = updates;
            this.stmts.updateProject.run(name, description, collection_id, collection_id, layout_dir, display_mode, id);

            // Return the updated project
            return this.getProject(id);
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    }

    // Assign project to collection
    assignProjectToCollection(projectId, collectionId) {
        try {
            return this.updateProject(projectId, { collection_id: collectionId });
        } catch (error) {
            console.error('Error assigning project to collection:', error);
            throw error;
        }
    }

    // Remove project from collection
    removeProjectFromCollection(projectId) {
        try {
            return this.updateProject(projectId, { collection_id: null });
        } catch (error) {
            console.error('Error removing project from collection:', error);
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

    createNodesBulk(nodes) {
        try {
            const insertMany = this.db.transaction((nodesList) => {
                for (const nodeData of nodesList) {
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
                }
            });
            insertMany(nodes);
            return { success: true, count: nodes.length };
        } catch (error) {
            console.error('Error in bulk create:', error);
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
                cli_command = node.cli_command,
                sort_order = node.sort_order
            } = updates;

            this.stmts.updateNode.run(
                title, content, status, priority,
                start_date, end_date, days_spent,
                code_language, code_content, task_prompt, cli_command,
                sort_order, id
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

    // Bulk Reorder
    reorderNodes(updates) {
        try {
            const stmt = this.db.prepare(`UPDATE nodes SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
            const transaction = this.db.transaction((updatesArray) => {
                for (const update of updatesArray) {
                    stmt.run(update.sort_order, update.id);
                }
            });
            transaction(updates);
            return { success: true };
        } catch (error) {
            console.error('Error reordering nodes:', error);
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

    // Node Progress Operations
    addNodeProgress(nodeId, message, agentType = 'ai') {
        try {
            const { v4: uuidv4 } = require('uuid');
            const id = uuidv4();
            this.stmts.insertNodeProgress.run(id, nodeId, message, agentType);
            return { id, node_id: nodeId, message, agent_type: agentType, created_at: new Date().toISOString() };
        } catch (error) {
            console.error('Error adding node progress:', error);
            throw error;
        }
    }

    getNodeProgress(nodeId) {
        try {
            return this.stmts.getNodeProgress.all(nodeId);
        } catch (error) {
            console.error('Error getting node progress:', error);
            throw error;
        }
    }

    deleteNodeProgress(nodeId) {
        try {
            this.stmts.deleteNodeProgress.run(nodeId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting node progress:', error);
            throw error;
        }
    }

    // Project Activity Operations
    logActivity(projectId, activityType, activityData, nodeId = null, userAgent = null, ipAddress = null) {
        try {
            const { v4: uuidv4 } = require('uuid');
            const id = uuidv4();
            const dataString = typeof activityData === 'string' ? activityData : JSON.stringify(activityData);

            this.stmts.insertProjectActivity.run(id, projectId, activityType, dataString, nodeId, userAgent, ipAddress);
            return {
                id,
                project_id: projectId,
                activity_type: activityType,
                activity_data: dataString,
                node_id: nodeId,
                user_agent: userAgent,
                ip_address: ipAddress,
                created_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error logging activity:', error);
            throw error;
        }
    }

    getProjectActivity(projectId, limit = 50, offset = 0) {
        try {
            const activities = this.stmts.getProjectActivity.all(projectId, limit, offset);

            // Parse activity_data back to objects where possible
            return activities.map(activity => {
                try {
                    const parsedData = JSON.parse(activity.activity_data);
                    return { ...activity, activity_data: parsedData };
                } catch {
                    // If not valid JSON, keep as string
                    return activity;
                }
            });
        } catch (error) {
            console.error('Error getting project activity:', error);
            throw error;
        }
    }

    getProjectActivityCount(projectId) {
        try {
            return this.stmts.getProjectActivityCount.get(projectId).count;
        } catch (error) {
            console.error('Error getting project activity count:', error);
            throw error;
        }
    }

    deleteProjectActivity(projectId) {
        try {
            this.stmts.deleteProjectActivity.run(projectId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting project activity:', error);
            throw error;
        }
    }

    // Audio File Operations
    getNodeAudioFiles(nodeId) {
        try {
            return this.stmts.getNodeAudio.all(nodeId);
        } catch (error) {
            console.error('Error getting node audio files:', error);
            throw error;
        }
    }

    getAudioFile(id) {
        try {
            return this.stmts.getAudioById.get(id);
        } catch (error) {
            console.error('Error getting audio file:', error);
            throw error;
        }
    }

    createAudioFile(data) {
        try {
            this.stmts.insertAudio.run(
                data.id, data.node_id, data.project_id,
                data.original_filename, data.stored_filename,
                data.file_path, data.file_size ?? null, data.mime_type ?? null
            );
            return this.stmts.getAudioById.get(data.id);
        } catch (error) {
            console.error('Error creating audio file record:', error);
            throw error;
        }
    }

    deleteAudioFile(id) {
        try {
            this.stmts.deleteAudio.run(id);
            return { success: true };
        } catch (error) {
            console.error('Error deleting audio file record:', error);
            throw error;
        }
    }

    // AI-focused methods
    getNodeWithProgress(nodeId) {
        try {
            const node = this.getNode(nodeId);
            if (!node) return null;

            const progress = this.getNodeProgress(nodeId);
            return { ...node, progress_history: progress };
        } catch (error) {
            console.error('Error getting node with progress:', error);
            throw error;
        }
    }

    getProjectWithContext(projectId) {
        try {
            const project = this.getProject(projectId);
            if (!project) return null;

            const nodes = this.getProjectNodes(projectId);

            // Add progress history to each node
            const nodesWithProgress = nodes.map(node => {
                const progress = this.getNodeProgress(node.id);
                return { ...node, progress_history: progress };
            });

            return {
                project,
                nodes: nodesWithProgress,
                stats: {
                    total_nodes: nodes.length,
                    pending: nodes.filter(n => n.status === 'pending').length,
                    in_progress: nodes.filter(n => n.status === 'in-progress').length,
                    completed: nodes.filter(n => n.status === 'completed').length
                }
            };
        } catch (error) {
            console.error('Error getting project with context:', error);
            throw error;
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

    // ── Split a node ─────────────────────────────────────────────────────────────
    // Creates two new intermediate "group" nodes as direct children of `nodeId`,
    // then reparents the existing children evenly between them.
    // Requires at least 4 direct children. Atomic — rolls back on any error.
    splitNode(nodeId, groupATitle, groupAContent, groupBTitle, groupBContent) {
        const { v4: uuidv4 } = require('uuid');

        const node = this.getNode(nodeId);
        if (!node) throw new Error(`Node '${nodeId}' not found`);

        const children = this.db.prepare(
            `SELECT * FROM nodes WHERE parent_id = ? ORDER BY sort_order ASC, created_at ASC`
        ).all(nodeId);

        if (children.length < 4) {
            throw new Error(`Node must have at least 4 children to split (has ${children.length})`);
        }

        const midpoint = Math.ceil(children.length / 2);
        const groupAChildren = children.slice(0, midpoint);
        const groupBChildren = children.slice(midpoint);

        const groupAId = uuidv4();
        const groupBId = uuidv4();
        const groupDepth = (node.depth_level ?? 0) + 1;

        // Prepared statements for reparenting
        const reparentStmt   = this.db.prepare(`UPDATE nodes SET parent_id  = ? WHERE id = ?`);
        const depthDeltaStmt = this.db.prepare(`UPDATE nodes SET depth_level = depth_level + ? WHERE id = ?`);
        const getChildrenIds = this.db.prepare(`SELECT id FROM nodes WHERE parent_id = ?`);

        // Recursively increment depth_level by `delta` for a node and all its descendants
        const bumpSubtreeDepth = (rootId, delta) => {
            const queue = [rootId];
            while (queue.length > 0) {
                const id = queue.shift();
                depthDeltaStmt.run(delta, id);
                for (const row of getChildrenIds.all(id)) queue.push(row.id);
            }
        };

        const tx = this.db.transaction(() => {
            // Insert Group A
            this.stmts.insertNode.run(
                groupAId, node.project_id, nodeId,
                groupATitle, groupAContent,
                'pending', 'medium',
                null, null, 0, null, null, null, null,
                0, groupDepth
            );

            // Insert Group B
            this.stmts.insertNode.run(
                groupBId, node.project_id, nodeId,
                groupBTitle, groupBContent,
                'pending', 'medium',
                null, null, 0, null, null, null, null,
                1, groupDepth
            );

            // Reparent Group A's children and bump their entire subtree depth by +1
            groupAChildren.forEach((child) => {
                reparentStmt.run(groupAId, child.id);
                bumpSubtreeDepth(child.id, 1);
            });

            // Reparent Group B's children and bump their entire subtree depth by +1
            groupBChildren.forEach((child) => {
                reparentStmt.run(groupBId, child.id);
                bumpSubtreeDepth(child.id, 1);
            });

            return {
                groupA: this.getNode(groupAId),
                groupB: this.getNode(groupBId),
                groupACount: groupAChildren.length,
                groupBCount: groupBChildren.length,
            };
        });

        return tx();
    }

    close() {
        if (this.db) {
            this.db.close();
            console.error('✅ Database connection closed');
        }
    }

    // ===== PIPELINE COLLECTIONS =====

    getAllPipelineCollections() {
        return this.db.prepare(`SELECT * FROM pipeline_collections ORDER BY created_at ASC`).all();
    }
    createPipelineCollection(id, name, description, color) {
        this.db.prepare(`INSERT INTO pipeline_collections (id, name, description, color) VALUES (?, ?, ?, ?)`).run(id, name, description || '', color || '#6366f1');
        return this.db.prepare(`SELECT * FROM pipeline_collections WHERE id = ?`).get(id);
    }
    updatePipelineCollection(id, patch) {
        const fields = [], vals = [];
        if (patch.name        !== undefined) { fields.push('name = ?');        vals.push(patch.name); }
        if (patch.description !== undefined) { fields.push('description = ?'); vals.push(patch.description); }
        if (patch.color       !== undefined) { fields.push('color = ?');       vals.push(patch.color); }
        if (!fields.length) return this.db.prepare(`SELECT * FROM pipeline_collections WHERE id = ?`).get(id);
        fields.push('updated_at = CURRENT_TIMESTAMP');
        this.db.prepare(`UPDATE pipeline_collections SET ${fields.join(', ')} WHERE id = ?`).run(...vals, id);
        return this.db.prepare(`SELECT * FROM pipeline_collections WHERE id = ?`).get(id);
    }
    deletePipelineCollection(id) {
        this.db.prepare(`DELETE FROM pipeline_collections WHERE id = ?`).run(id);
    }

    // ===== PIPELINE TASKS =====

    getAllPipelineTasks(collectionId) {
        const rows = collectionId
            ? this.db.prepare(`SELECT * FROM pipeline_tasks WHERE collection_id = ? ORDER BY created_at DESC`).all(collectionId)
            : this.db.prepare(`SELECT * FROM pipeline_tasks ORDER BY created_at DESC`).all();
        return rows.map(t => ({ ...t, node_count: this.db.prepare(`SELECT COUNT(*) as c FROM pipeline_nodes WHERE task_id = ?`).get(t.id).c, done_count: this.db.prepare(`SELECT COUNT(*) as c FROM pipeline_nodes WHERE task_id = ? AND status = 'done'`).get(t.id).c }));
    }
    getPipelineTask(id) {
        const task = this.db.prepare(`SELECT * FROM pipeline_tasks WHERE id = ?`).get(id);
        if (!task) return null;
        const nodes = this.db.prepare(`SELECT * FROM pipeline_nodes WHERE task_id = ? ORDER BY sort_order ASC`).all(id);
        const edges = this.db.prepare(`SELECT * FROM pipeline_edges WHERE task_id = ?`).all(id);
        return { ...task, nodes, edges };
    }
    createPipelineTask(id, name, description, type, priority, collectionId, dueDate) {
        this.db.prepare(`INSERT INTO pipeline_tasks (id, name, description, type, priority, collection_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, name, description || '', type || 'general', priority || 'medium', collectionId || null, dueDate || null);
        return this.getPipelineTask(id);
    }
    updatePipelineTask(id, patch) {
        const allowed = ['name', 'description', 'type', 'status', 'priority', 'collection_id', 'due_date'];
        const fields = [], vals = [];
        for (const k of allowed) if (patch[k] !== undefined) { fields.push(`${k} = ?`); vals.push(patch[k]); }
        if (!fields.length) return this.getPipelineTask(id);
        fields.push('updated_at = CURRENT_TIMESTAMP');
        this.db.prepare(`UPDATE pipeline_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...vals, id);
        return this.getPipelineTask(id);
    }
    deletePipelineTask(id) {
        this.db.prepare(`DELETE FROM pipeline_tasks WHERE id = ?`).run(id);
    }

    // ===== PIPELINE NODES =====

    createPipelineNode(id, taskId, title, description, type, sortOrder, posX, posY) {
        this.db.prepare(`INSERT INTO pipeline_nodes (id, task_id, title, description, type, sort_order, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, taskId, title, description || '', type || 'step', sortOrder || 0, posX || 0, posY || 0);
        return this.db.prepare(`SELECT * FROM pipeline_nodes WHERE id = ?`).get(id);
    }
    updatePipelineNode(id, patch) {
        const allowed = ['title', 'description', 'status', 'type', 'notes', 'cli_command', 'due_date', 'position_x', 'position_y', 'sort_order'];
        const fields = [], vals = [];
        for (const k of allowed) if (patch[k] !== undefined) { fields.push(`${k} = ?`); vals.push(patch[k]); }
        if (!fields.length) return this.db.prepare(`SELECT * FROM pipeline_nodes WHERE id = ?`).get(id);
        fields.push('updated_at = CURRENT_TIMESTAMP');
        this.db.prepare(`UPDATE pipeline_nodes SET ${fields.join(', ')} WHERE id = ?`).run(...vals, id);
        return this.db.prepare(`SELECT * FROM pipeline_nodes WHERE id = ?`).get(id);
    }
    deletePipelineNode(id) {
        this.db.prepare(`DELETE FROM pipeline_nodes WHERE id = ?`).run(id);
    }

    // ===== PIPELINE EDGES =====

    createPipelineEdge(id, taskId, sourceId, targetId, label) {
        this.db.prepare(`INSERT OR IGNORE INTO pipeline_edges (id, task_id, source_id, target_id, label) VALUES (?, ?, ?, ?, ?)`).run(id, taskId, sourceId, targetId, label || '');
        return this.db.prepare(`SELECT * FROM pipeline_edges WHERE id = ?`).get(id);
    }
    deletePipelineEdge(id) {
        this.db.prepare(`DELETE FROM pipeline_edges WHERE id = ?`).run(id);
    }

    // ===== GRAPH SETTINGS =====

    getGraphSettings(projectId) {
        const row = this.db.prepare('SELECT * FROM graph_settings WHERE project_id = ?').get(projectId);
        if (!row) return { project_id: projectId, layout_name: 'dagre', positions: {}, zoom: 1, pan_x: 0, pan_y: 0 };
        return { ...row, positions: JSON.parse(row.positions || '{}') };
    }

    saveGraphSettings(projectId, { layout_name, zoom, pan_x, pan_y }) {
        const existing = this.db.prepare('SELECT project_id FROM graph_settings WHERE project_id = ?').get(projectId);
        if (existing) {
            const fields = [];
            const vals = [];
            if (layout_name !== undefined) { fields.push('layout_name = ?'); vals.push(layout_name); }
            if (zoom !== undefined)        { fields.push('zoom = ?');        vals.push(zoom); }
            if (pan_x !== undefined)       { fields.push('pan_x = ?');       vals.push(pan_x); }
            if (pan_y !== undefined)       { fields.push('pan_y = ?');       vals.push(pan_y); }
            if (fields.length) {
                fields.push('updated_at = CURRENT_TIMESTAMP');
                this.db.prepare(`UPDATE graph_settings SET ${fields.join(', ')} WHERE project_id = ?`).run(...vals, projectId);
            }
        } else {
            this.db.prepare(`
                INSERT INTO graph_settings (project_id, layout_name, positions, zoom, pan_x, pan_y)
                VALUES (?, ?, '{}', ?, ?, ?)
            `).run(projectId, layout_name ?? 'dagre', zoom ?? 1, pan_x ?? 0, pan_y ?? 0);
        }
        return this.getGraphSettings(projectId);
    }

    saveGraphPositions(projectId, positions) {
        const posJson = JSON.stringify(positions);
        const existing = this.db.prepare('SELECT project_id FROM graph_settings WHERE project_id = ?').get(projectId);
        if (existing) {
            this.db.prepare('UPDATE graph_settings SET positions = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?').run(posJson, projectId);
        } else {
            this.db.prepare(`
                INSERT INTO graph_settings (project_id, layout_name, positions, zoom, pan_x, pan_y)
                VALUES (?, 'manual', ?, 1, 0, 0)
            `).run(projectId, posJson);
        }
    }
}

module.exports = DatabaseManager;
