#!/usr/bin/env node

/**
 * MindMap CLI - Command Line Interface for AI Co-Pilot Integration
 *
 * This tool allows AI agents to interact with the mind map database
 * to fetch tasks, update statuses, and track progress.
 */

const fs = require('fs');
const path = require('path');

// CLI Command Handler
class MindMapCLI {
    constructor() {
        this.baseUrl = process.env.MINDMAP_API_URL || 'http://localhost:3000';
        this.configFile = path.join(process.cwd(), '.mindmap-cli-config.json');
        this.loadConfig();
    }

    // ============================
    // Reset DB (Collections & Projects)
    // ============================
    async resetDatabase(options = {}) {
        const requestedDefaultId = options.defaultCollectionId || 'default-collection';
        const builtinDefaultId = 'default-collection';
        try {
            console.log('🧹 Resetting database: deleting all collections and projects (keeping default collection)...');

            // Ensure server is reachable by calling collections
            let collections = await this.makeRequest('/api/db/collections');

            // Try to find a default collection by id or by common name
            let builtinDefault =
                collections.find(c => c.id === builtinDefaultId) ||
                collections.find(c => (c.name || '').toLowerCase() === 'default') ||
                null;

            // If none found, create one and use the returned id
            if (!builtinDefault) {
                console.log('📦 Built-in default collection missing. Creating "Default"...');
                const created = await this.makeRequest('/api/db/collections', {
                    method: 'POST',
                    body: JSON.stringify({ name: 'Default', description: 'Default collection' })
                });
                builtinDefault = created || null;
                // Refresh collections to include the created one for subsequent lookups
                collections = await this.makeRequest('/api/db/collections');
            }

            // Determine which collection will be the target default for seeding
            const requestedExists = requestedDefaultId && collections.some(c => c.id === requestedDefaultId);
            const targetDefaultId = requestedExists ? requestedDefaultId : (builtinDefault ? builtinDefault.id : null);

            // Build preserve set: keep builtinDefault (by actual id) and requested id if it exists
            const preserveIds = new Set();
            if (builtinDefault && builtinDefault.id) preserveIds.add(builtinDefault.id);
            if (requestedExists) preserveIds.add(requestedDefaultId);

            // Delete all collections not in preserve set (their projects will be cascade-deleted)
            for (const col of collections) {
                if (!preserveIds.has(col.id)) {
                    await this.makeRequest(`/api/db/collections/${col.id}`, { method: 'DELETE' });
                    console.log(`🗑️  Deleted collection: ${col.name}`);
                }
            }

            // Delete ALL projects (including those not in any collection)
            const allProjects = await this.makeRequest('/api/db/projects');
            for (const proj of allProjects) {
                await this.makeRequest(`/api/db/projects/${proj.id}`, { method: 'DELETE' });
                console.log(`🗑️  Deleted project: ${proj.name}`);
            }

            // Resolve final default collection id to use for seeding
            let finalDefaultId = targetDefaultId;
            if (!finalDefaultId) {
                // As a fallback, re-fetch collections and pick the remaining one; if none, create new
                const cols = await this.makeRequest('/api/db/collections');
                if (cols && cols.length > 0) {
                    finalDefaultId = cols[0].id;
                } else {
                    const created = await this.makeRequest('/api/db/collections', {
                        method: 'POST',
                        body: JSON.stringify({ name: 'Default', description: 'Default collection' })
                    });
                    finalDefaultId = created.id;
                }
            }

            // Create a fresh empty map (with minimal dummy nodes) in the default collection
            const starterNodes = options.noDummy
                ? []
                : [
                    {
                        title: 'Getting Started',
                        status: 'pending',
                        priority: 'medium',
                        content: 'Add your first tasks under this node.',
                        children: [
                            { title: 'Create your first task', status: 'pending', priority: 'low' },
                            { title: 'Explore Board and Mind Map views', status: 'pending', priority: 'low' }
                        ]
                    }
                ];

            const projectPayload = {
                name: options.projectName || 'Empty Map',
                description: options.description || 'Starter project created after database reset',
                collection_id: finalDefaultId,
                nodes: starterNodes
            };

            const newProject = await this.makeRequest('/api/db/projects', {
                method: 'POST',
                body: JSON.stringify(projectPayload)
            });

            console.log('✅ Reset complete');
            console.log(`📦 Preserved collections: ${Array.from(preserveIds).join(', ')}`);
            console.log(`🆕 Created project: ${newProject.name} (${newProject.id})`);
        } catch (error) {
            console.error('❌ Error resetting database:', error.message);
            process.exit(1);
        }
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
                this.baseUrl = config.apiUrl || this.baseUrl;
            }
        } catch (error) {
            // Ignore config loading errors
        }
    }

    saveConfig(config) {
        try {
            const currentConfig = fs.existsSync(this.configFile)
                ? JSON.parse(fs.readFileSync(this.configFile, 'utf8'))
                : {};

            const newConfig = { ...currentConfig, ...config };
            fs.writeFileSync(this.configFile, JSON.stringify(newConfig, null, 2));
            console.log(`✅ Configuration saved to ${this.configFile}`);
        } catch (error) {
            console.error('❌ Failed to save configuration:', error.message);
        }
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const { default: fetch } = await import('node-fetch');

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Some endpoints may return 204 No Content or empty body
            const text = await response.text();
            if (!text) return {};
            try {
                return JSON.parse(text);
            } catch (e) {
                // If response isn't JSON (unexpected), return raw text
                return text;
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`Cannot connect to MindMap server at ${this.baseUrl}. Make sure the server is running.`);
            }
            throw error;
        }
    }

    // ============================
    // Collections
    // ============================
    async listCollections() {
        try {
            const collections = await this.makeRequest('/api/db/collections');
            if (!collections || collections.length === 0) {
                console.log('📚 No collections found');
                return;
            }
            console.log(`📚 Found ${collections.length} collections:`);
            collections.forEach(c => {
                console.log(`  📦 ${c.id} - ${c.name}`);
                if (c.description) console.log(`     📄 ${c.description}`);
                if (typeof c.project_count !== 'undefined') console.log(`     🗂️  ${c.project_count} projects`);
                console.log('');
            });
        } catch (error) {
            console.error('❌ Error listing collections:', error.message);
            process.exit(1);
        }
    }

    async createCollection(name, options = {}) {
        try {
            if (!name || name.trim() === '') {
                console.error('❌ Collection name is required');
                process.exit(1);
            }
            const body = { name: name.trim(), description: options.description || '' };
            const collection = await this.makeRequest('/api/db/collections', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            console.log('✅ Collection created:');
            console.log(JSON.stringify(collection, null, 2));
        } catch (error) {
            console.error('❌ Error creating collection:', error.message);
            process.exit(1);
        }
    }

    // ============================
    // Projects
    // ============================
    async createProject(name, options = {}) {
        try {
            if (!name || name.trim() === '') {
                console.error('❌ Project name is required');
                process.exit(1);
            }
            let nodes = [];
            // Optional nodes from JSON file
            const filePath = options.fromFile || options.nodesFile;
            if (filePath) {
                if (!fs.existsSync(filePath)) {
                    console.error(`❌ Nodes file not found: ${filePath}`);
                    process.exit(1);
                }
                const raw = fs.readFileSync(filePath, 'utf8');
                try {
                    const parsed = JSON.parse(raw);
                    // Accept either {nodes:[...]} or an array
                    nodes = Array.isArray(parsed) ? parsed : (parsed.nodes || []);
                } catch (e) {
                    console.error('❌ Invalid JSON in nodes file:', e.message);
                    process.exit(1);
                }
            }

            const body = {
                name: name.trim(),
                description: options.description || '',
                nodes,
                collection_id: options.collectionId || 'default-collection'
            };
            const project = await this.makeRequest('/api/db/projects', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            console.log('✅ Project created:');
            console.log(JSON.stringify(project, null, 2));
        } catch (error) {
            console.error('❌ Error creating project:', error.message);
            process.exit(1);
        }
    }

    async importJsonProject(filePath, options = {}) {
        try {
            if (!filePath) {
                console.error('❌ Usage: mindmap import-json <file> [--collection-id=<id>]');
                process.exit(1);
            }
            if (!fs.existsSync(filePath)) {
                console.error(`❌ File not found: ${filePath}`);
                process.exit(1);
            }
            const raw = fs.readFileSync(filePath, 'utf8');
            let payload;
            try {
                payload = JSON.parse(raw);
            } catch (e) {
                console.error('❌ Invalid JSON file:', e.message);
                process.exit(1);
            }
            payload.collection_id = options.collectionId || 'default-collection';
            // Provide base directory so server can resolve JSON import paths
            payload.base_dir = path.dirname(path.resolve(filePath));
            const response = await this.makeRequest('/api/db/import-json', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            console.log('✅ JSON import successful:');
            console.log(JSON.stringify(response, null, 2));
        } catch (error) {
            console.error('❌ Error importing JSON project:', error.message);
            process.exit(1);
        }
    }

    async assignProjectToCollection(projectId, options = {}) {
        try {
            if (!projectId) {
                console.error('❌ Usage: mindmap assign-project-collection <project-id> [--collection-id=<id>|--remove]');
                process.exit(1);
            }
            if (options.remove) {
                const response = await this.makeRequest(`/api/db/projects/${projectId}/collection`, {
                    method: 'DELETE'
                });
                console.log('✅ Project removed from collection');
                console.log(JSON.stringify(response, null, 2));
                return;
            }
            const collectionId = options.collectionId || 'default-collection';
            const response = await this.makeRequest(`/api/db/projects/${projectId}/collection`, {
                method: 'PUT',
                body: JSON.stringify({ collection_id: collectionId })
            });
            console.log('✅ Project assigned to collection');
            console.log(JSON.stringify(response, null, 2));
        } catch (error) {
            console.error('❌ Error assigning project to collection:', error.message);
            process.exit(1);
        }
    }

    // ============================
    // Nodes (JSON-based operations)
    // ============================
    async updateNodeJson(nodeId, filePath) {
        try {
            if (!nodeId || !filePath) {
                console.error('❌ Usage: mindmap update-node-json <node-id> --file=<path>');
                process.exit(1);
            }
            if (!fs.existsSync(filePath)) {
                console.error(`❌ File not found: ${filePath}`);
                process.exit(1);
            }
            const raw = fs.readFileSync(filePath, 'utf8');
            let updates;
            try {
                updates = JSON.parse(raw);
            } catch (e) {
                console.error('❌ Invalid JSON:', e.message);
                process.exit(1);
            }
            const response = await this.makeRequest(`/api/db/nodes/${nodeId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            console.log('✅ Node updated:');
            console.log(JSON.stringify(response, null, 2));
        } catch (error) {
            console.error('❌ Error updating node:', error.message);
            process.exit(1);
        }
    }

    async createNodeJson(filePath, options = {}) {
        try {
            if (!filePath) {
                console.error('❌ Usage: mindmap create-node-json --file=<path> --project-id=<id>');
                process.exit(1);
            }
            if (!fs.existsSync(filePath)) {
                console.error(`❌ File not found: ${filePath}`);
                process.exit(1);
            }
            const raw = fs.readFileSync(filePath, 'utf8');
            let node;
            try {
                node = JSON.parse(raw);
            } catch (e) {
                console.error('❌ Invalid JSON:', e.message);
                process.exit(1);
            }
            if (!node.project_id) {
                const pid = options.projectId;
                if (!pid) {
                    console.error('❌ project_id is required in JSON or via --project-id');
                    process.exit(1);
                }
                node.project_id = pid;
            }
            const response = await this.makeRequest('/api/db/nodes', {
                method: 'POST',
                body: JSON.stringify(node)
            });
            console.log('✅ Node created:');
            console.log(JSON.stringify(response, null, 2));
        } catch (error) {
            console.error('❌ Error creating node:', error.message);
            process.exit(1);
        }
    }

    // ============================
    // Map Generation (LLM)
    // ============================
    async generateMap(options = {}) {
        try {
            const source = options.source;
            if (!source) {
                console.error('❌ Usage: mindmap generate --source=<file|url|dir> [--provider=ollama] [--model=llama3.2] [--project-id=<id>] [--parent-node-id=<id>] [--name="Project Name"]');
                process.exit(1);
            }

            let content = '';
            if (source.startsWith('http://') || source.startsWith('https://')) {
                console.log(`🌐 Fetching URL: ${source}`);
                const { default: fetch } = await import('node-fetch');
                const res = await fetch(source);
                if (!res.ok) throw new Error(`Failed to fetch URL: ${res.statusText}`);
                const html = await res.text();
                // Simple stripping of html tags
                content = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            } else {
                const stat = fs.statSync(source);
                if (stat.isDirectory()) {
                    console.log(`📁 Reading directory: ${source}`);
                    const files = fs.readdirSync(source);
                    for (const file of files) {
                        const ext = path.extname(file).toLowerCase();
                        if (['.md', '.txt', '.js', '.ts', '.html'].includes(ext)) {
                            content += `\n\n--- ${file} ---\n`;
                            content += fs.readFileSync(path.join(source, file), 'utf8');
                        }
                    }
                } else {
                    console.log(`📄 Reading file: ${source}`);
                    content = fs.readFileSync(source, 'utf8');
                }
            }

            if (content.length > 100000) {
                console.log('⚠️ Content is very large, truncating for LLM context...');
                content = content.substring(0, 100000);
            }

            const providerName = options.provider || 'ollama';
            const { OllamaProvider, CLIProvider } = require('./llm-providers.js');
            let provider;

            if (providerName === 'ollama') {
                provider = new OllamaProvider({ model: options.model });
            } else if (providerName === 'agy' || providerName === 'codex' || providerName === 'claude') {
                provider = new CLIProvider({ binary: providerName });
            } else {
                console.error(`❌ Unknown provider: ${providerName}. Supported: ollama, agy, codex, claude`);
                process.exit(1);
            }

            console.log(`🧠 Checking provider ${providerName}...`);
            const isAvail = await provider.isAvailable();
            if (!isAvail) {
                console.error(`❌ Provider ${providerName} is not available. Please ensure it is installed and running.`);
                process.exit(1);
            }

            console.log(`🤖 Generating mind map using ${providerName}... This may take a while.`);
            const result = await provider.generate(content, options);
            
            if (!result.nodes || !Array.isArray(result.nodes)) {
                console.error('❌ Generated result does not contain a valid nodes array.');
                console.error('Raw result:', JSON.stringify(result, null, 2));
                process.exit(1);
            }

            console.log(`✅ Generated map with ${result.nodes.length} root nodes.`);

            // Upload to backend
            if (options.projectId) {
                console.log(`⬆️ Uploading to existing project: ${options.projectId}`);
                const endpoint = `/api/db/projects/${options.projectId}/bulk-import`;
                const response = await this.makeRequest(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({
                        nodes: result.nodes,
                        parent_id: options.parentNodeId || null
                    })
                });
                console.log('🎉 Successfully added generated nodes to project!');
                console.log(`   Imported ${response.imported_count} nodes.`);
            } else {
                console.log('⬆️ Creating new project from generated nodes...');
                const name = options.name || result.project?.name || 'Generated Project';
                const description = options.description || result.project?.description || 'Auto-generated mind map';
                
                const projRes = await this.makeRequest('/api/db/projects', {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        description,
                        collection_id: options.collectionId || 'default-collection',
                        nodes: result.nodes
                    })
                });
                console.log('🎉 Successfully created new project!');
                console.log(`   Project ID: ${projRes.id}`);
                console.log(`   Nodes: ${projRes.nodes?.length || result.nodes.length}`);
            }

        } catch (error) {
            console.error('❌ Error generating map:', error.message);
            process.exit(1);
        }
    }

    // Command: List all projects
    async listProjects() {
        try {
            const response = await this.makeRequest('/api/db/projects');

            if (response.length === 0) {
                console.log('📝 No projects found');
                return;
            }

            console.log(`📋 Found ${response.length} projects:`);
            response.forEach(project => {
                console.log(`  🗂️  ${project.id} - ${project.name}`);
                if (project.description) {
                    console.log(`      📄 ${project.description}`);
                }
                console.log(`      📊 ${project.node_count || 0} nodes`);
                console.log('');
            });
        } catch (error) {
            console.error('❌ Error listing projects:', error.message);
            process.exit(1);
        }
    }

    // Command: Get project with context
    async getProject(projectId, options = {}) {
        try {
            const response = await this.makeRequest(`/api/ai/projects/${projectId}`);

            if (options.format === 'json') {
                console.log(JSON.stringify(response, null, 2));
                return;
            }

            console.log(`📋 Project: ${response.project.name}`);
            console.log(`📄 Description: ${response.project.description || 'No description'}`);
            console.log(`📊 Stats: ${response.stats.total_nodes} total nodes`);
            console.log(`   📋 Pending: ${response.stats.pending}`);
            console.log(`   🔄 In Progress: ${response.stats.in_progress}`);
            console.log(`   ✅ Completed: ${response.stats.completed}`);

            if (options.showNodes) {
                console.log('\n🌳 Nodes:');
                response.nodes.slice(0, 10).forEach(node => {
                    const statusIcon = node.status === 'completed' ? '✅' :
                                     node.status === 'in-progress' ? '🔄' : '📋';
                    console.log(`  ${statusIcon} ${node.title} (${node.priority})`);
                });

                if (response.nodes.length > 10) {
                    console.log(`  ... and ${response.nodes.length - 10} more nodes`);
                }
            }
        } catch (error) {
            console.error('❌ Error getting project:', error.message);
            process.exit(1);
        }
    }

    // Command: Get node details
    async getNode(nodeId) {
        try {
            const response = await this.makeRequest(`/api/ai/nodes/${nodeId}`);

            console.log(`📝 Node: ${response.title}`);
            console.log(`📊 Status: ${response.status} | Priority: ${response.priority}`);

            if (response.content) {
                console.log(`📄 Description: ${response.content}`);
            }

            if (response.task_prompt) {
                console.log(`🤖 Task Prompt: ${response.task_prompt}`);
            }

            if (response.cli_command) {
                console.log(`⚡ CLI Command: ${response.cli_command}`);
            }

            if (response.progress_history && response.progress_history.length > 0) {
                console.log(`\n📈 Progress History (${response.progress_history.length} entries):`);
                response.progress_history.forEach(entry => {
                    const date = new Date(entry.created_at).toLocaleString();
                    console.log(`  🤖 ${date}: ${entry.message}`);
                });
            }
        } catch (error) {
            console.error('❌ Error getting node:', error.message);
            process.exit(1);
        }
    }

    // Command: List available tasks (pending nodes)
    async listTasks(options = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (options.priority) queryParams.append('priority', options.priority);
            if (options.limit) queryParams.append('limit', options.limit);
            if (options.projectId) queryParams.append('project_id', options.projectId);

            const response = await this.makeRequest(`/api/ai/tasks/queue?${queryParams}`);

            // If _returnData option is set, return the response instead of printing
            if (options._returnData) {
                return response;
            }

            if (response.tasks.length === 0) {
                console.log('📋 No pending tasks found');
                return;
            }

            console.log(`📋 Found ${response.tasks.length} pending tasks:`);
            response.tasks.forEach(task => {
                const priorityIcon = task.priority === 'high' ? '🔴' :
                                   task.priority === 'medium' ? '🟡' : '🟢';
                console.log(`  ${priorityIcon} ${task.title}`);
                console.log(`     📁 Project: ${task.project_name}`);
                console.log(`     🔗 ID: ${task.id}`);
                if (task.content) {
                    const preview = task.content.length > 100
                        ? task.content.substring(0, 100) + '...'
                        : task.content;
                    console.log(`     📄 ${preview}`);
                }
                console.log('');
            });
        } catch (error) {
            console.error('❌ Error listing tasks:', error.message);
            process.exit(1);
        }
    }

    // Command: Update node status
    async updateStatus(nodeId, newStatus) {
        try {
            const validStatuses = ['pending', 'in-progress', 'completed'];
            if (!validStatuses.includes(newStatus)) {
                console.error(`❌ Invalid status "${newStatus}". Valid options: ${validStatuses.join(', ')}`);
                process.exit(1);
            }

            const response = await this.makeRequest(`/api/ai/nodes/${nodeId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            console.log(`✅ Status updated: ${response.previous_status} → ${response.new_status}`);
            console.log(`📝 Node: ${response.node.title}`);
        } catch (error) {
            console.error('❌ Error updating status:', error.message);
            process.exit(1);
        }
    }

    // Command: Add progress to node
    async addProgress(nodeId, message) {
        try {
            const response = await this.makeRequest(`/api/ai/nodes/${nodeId}/progress`, {
                method: 'POST',
                body: JSON.stringify({ message })
            });

            console.log(`✅ Progress added to: ${response.node_title}`);
            console.log(`📝 Message: "${response.progress.message}"`);
        } catch (error) {
            console.error('❌ Error adding progress:', error.message);
            process.exit(1);
        }
    }

    // Command: Search tasks
    async search(query, options = {}) {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('q', query);
            if (options.status) queryParams.append('status', options.status);
            if (options.priority) queryParams.append('priority', options.priority);
            if (options.projectId) queryParams.append('project_id', options.projectId);

            const response = await this.makeRequest(`/api/ai/search?${queryParams}`);

            if (response.results.length === 0) {
                console.log(`🔍 No results found for "${query}"`);
                return;
            }

            console.log(`🔍 Found ${response.results.length} results for "${query}":`);
            response.results.forEach(result => {
                const statusIcon = result.status === 'completed' ? '✅' :
                                 result.status === 'in-progress' ? '🔄' : '📋';
                console.log(`  ${statusIcon} ${result.title}`);
                console.log(`     📁 Project: ${result.project_name}`);
                console.log(`     🔗 ID: ${result.id}`);
                console.log('');
            });
        } catch (error) {
            console.error('❌ Error searching:', error.message);
            process.exit(1);
        }
    }

    // Command: Filter tasks with flexible criteria
    async filterTasks(options = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (options.priority) queryParams.append('priority', options.priority);
            if (options.status) queryParams.append('status', options.status);
            if (options.projectId) queryParams.append('project_id', options.projectId);
            if (options.limit) queryParams.append('limit', options.limit);

            const response = await this.makeRequest(`/api/ai/tasks?${queryParams}`);

            // If _returnData option is set, return the response instead of printing
            if (options._returnData) {
                return response;
            }

            if (options.format === 'json') {
                console.log(JSON.stringify(response));
                return;
            }

            if (response.tasks.length === 0) {
                console.log('📋 No tasks found matching the specified criteria');
                if (options.priority || options.status || options.projectId) {
                    console.log('🔍 Filters applied:');
                    if (options.projectId) console.log(`   📁 Project: ${options.projectId}`);
                    if (options.priority) console.log(`   ⚡ Priority: ${options.priority}`);
                    if (options.status) console.log(`   📊 Status: ${options.status}`);
                }
                return;
            }

            // Build filter description
            let filterDesc = '';
            const filters = [];
            if (options.projectId) filters.push(`project ${options.projectId}`);
            if (options.priority) filters.push(`${options.priority} priority`);
            if (options.status) filters.push(`${options.status} status`);

            if (filters.length > 0) {
                filterDesc = ` (${filters.join(', ')})`;
            }

            console.log(`📋 Found ${response.tasks.length} tasks${filterDesc}:`);
            response.tasks.forEach(task => {
                const priorityIcon = task.priority === 'high' ? '🔴' :
                                   task.priority === 'medium' ? '🟡' : '🟢';
                const statusIcon = task.status === 'completed' ? '✅' :
                                 task.status === 'in-progress' ? '🔄' : '⏳';
                console.log(`  ${priorityIcon}${statusIcon} ${task.title}`);
                console.log(`     📁 Project: ${task.project_name}`);
                console.log(`     🔗 ID: ${task.id}`);
                console.log(`     ⚡ Priority: ${task.priority} | 📊 Status: ${task.status}`);
                if (task.content) {
                    const content = task.content;
                    const preview = content.length > 100
                        ? content.substring(0, 100) + '...'
                        : content;
                    console.log(`     📄 ${preview}`);
                }
                console.log('');
            });
        } catch (error) {
            console.error('❌ Error filtering tasks:', error.message);
            process.exit(1);
        }
    }

    // Command: Get highest priority task in a project
    async getHighestPriorityTask(projectId, options = {}) {
        try {
            const response = await this.listTasks({
                projectId,
                limit: 1,
                _returnData: true
            });

            if (!response || response.tasks.length === 0) {
                if (options.format === 'json') {
                    console.log(JSON.stringify({ task: null, message: 'No pending tasks found in project' }));
                } else {
                    console.log('📋 No pending tasks found in this project');
                }
                return;
            }

            const task = response.tasks[0]; // First task is highest priority due to sorting

            if (options.format === 'json') {
                console.log(JSON.stringify({ task }));
            } else {
                const priorityIcon = task.priority === 'high' ? '🔴' :
                                   task.priority === 'medium' ? '🟡' : '🟢';
                console.log(`🎯 Highest Priority Task in Project:`);
                console.log(`  ${priorityIcon} ${task.title}`);
                console.log(`     📁 Project: ${task.project_name}`);
                console.log(`     🔗 ID: ${task.id}`);
                console.log(`     ⚡ Priority: ${task.priority}`);
                if (task.comment) {
                    const truncated = task.comment.length > 100 ?
                        task.comment.substring(0, 100) + '...' : task.comment;
                    console.log(`     📄 ${truncated}`);
                }
            }
        } catch (error) {
            console.error('❌ Error getting highest priority task:', error.message);
            process.exit(1);
        }
    }

    // Command: Get lowest priority task in a project
    async getLowestPriorityTask(projectId, options = {}) {
        try {
            // Get all tasks for the project
            const response = await this.listTasks({
                projectId,
                limit: 1000, // Get all tasks
                _returnData: true
            });

            if (!response || response.tasks.length === 0) {
                if (options.format === 'json') {
                    console.log(JSON.stringify({ task: null, message: 'No pending tasks found in project' }));
                } else {
                    console.log('📋 No pending tasks found in this project');
                }
                return;
            }

            // Find the lowest priority task (since API sorts high->medium->low, last one is lowest)
            const task = response.tasks[response.tasks.length - 1];

            if (options.format === 'json') {
                console.log(JSON.stringify({ task }));
            } else {
                const priorityIcon = task.priority === 'high' ? '🔴' :
                                   task.priority === 'medium' ? '🟡' : '🟢';
                console.log(`🎯 Lowest Priority Task in Project:`);
                console.log(`  ${priorityIcon} ${task.title}`);
                console.log(`     📁 Project: ${task.project_name}`);
                console.log(`     🔗 ID: ${task.id}`);
                console.log(`     ⚡ Priority: ${task.priority}`);
                if (task.comment) {
                    const truncated = task.comment.length > 100 ?
                        task.comment.substring(0, 100) + '...' : task.comment;
                    console.log(`     📄 ${truncated}`);
                }
            }
        } catch (error) {
            console.error('❌ Error getting lowest priority task:', error.message);
            process.exit(1);
        }
    }

    // Command: Configure CLI
    async configure(options = {}) {
        if (options.apiUrl) {
            this.saveConfig({ apiUrl: options.apiUrl });
            this.baseUrl = options.apiUrl;
        }

        if (options.list) {
            console.log('📋 Current configuration:');
            console.log(`   API URL: ${this.baseUrl}`);
            console.log(`   Config file: ${this.configFile}`);
        }
    }

    // Display help
    showHelp() {
        console.log(`
🧠 MindMap CLI - AI Co-Pilot Integration Tool

USAGE:
  mindmap <command> [options]

COMMANDS:
  projects                        List all projects
    collections                     List all collections
    create-collection <name>        Create a new collection (use --description=...)
    create-project <name>           Create a new project (use --collection-id=... --description=... [--from-file=<nodes.json>])
    import-json <file>              Create project by importing JSON (auto-detects shape; uses --collection-id if provided)
    generate                        Generate mind map using LLM (--source=<file|url|dir> [--provider=ollama] [--model=llama3.2] [--project-id=<id>] [--parent-node-id=<id>] [--name="Name"])
  get-project <id>                Get project details with context
  get-node <id>                   Get node details with progress history
  list-tasks                      List pending tasks (AI task queue)
  filter-tasks                    Filter tasks by priority, status, and/or project
  highest-priority-task <proj-id> Get highest priority task in project
  lowest-priority-task <proj-id>  Get lowest priority task in project
    reset-db                        Delete all collections and projects except the default; then create a fresh empty map in default
  update-status <id> <status>     Update node status (pending|in-progress|completed)
  add-progress <id> <message>     Add progress message to node
    update-node-json <id>           Update node using JSON file (--file=path)
    create-node-json                Create node from JSON file (--file=path --project-id=<id>)
    assign-project-collection <project-id>  Assign or remove project to/from a collection (--collection-id=<id> | --remove)
  search <query>                  Search for tasks/nodes
  config                          Configure CLI settings
  help                            Show this help message

OPTIONS:
  --priority=<high|medium|low>          Filter by priority
  --status=<pending|in-progress|completed> Filter by status
  --limit=<number>                      Limit number of results
  --project-id=<id>                     Filter by project
    --collection-id=<id>                  Target collection id
  --format=<json|human>                 Output format
  --show-nodes                          Show nodes in project details
    --description=<text>                  Description for create commands
    --from-file=<path>                    Load nodes from JSON when creating project
    --nodes-file=<path>                   Alias of --from-file
    --file=<path>                         JSON file path for node update/create
    --remove                              Remove assignment (for assign-project-collection)

CONFIGURATION:
  mindmap config --api-url=<url>     Set API endpoint
  mindmap config --list              Show current config

EXAMPLES:
  mindmap projects
  mindmap list-tasks --priority=high --limit=5
  mindmap filter-tasks --project-id=abc123 --priority=medium
  mindmap filter-tasks --status=in-progress --limit=10
  mindmap filter-tasks --project-id=abc123 --status=completed
  mindmap highest-priority-task abc123
  mindmap lowest-priority-task abc123 --format=json
  mindmap get-project abc123 --show-nodes
  mindmap update-status node123 in-progress
  mindmap add-progress node123 "Completed authentication logic"
  mindmap search "authentication" --status=pending

For more information, visit: https://github.com/your-repo/mindmap-cli
        `);
    }
}

// Main CLI execution
async function main() {
    const cli = new MindMapCLI();
    const args = process.argv.slice(2);

    if (args.length === 0) {
        cli.showHelp();
        return;
    }

    const command = args[0];
    const options = {};

    // Parse options (support hyphenated flags and camelCase access)
    args.slice(1).forEach(arg => {
        if (!arg.startsWith('--')) return;
        const [rawKey, valueRaw] = arg.slice(2).split('=');
        const value = (typeof valueRaw === 'undefined') ? true : valueRaw;
        const noHyphens = rawKey.replace(/-/g, '');
        const camel = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        options[noHyphens] = value;       // e.g., project-id -> projectid
        options[camel] = value;           // e.g., project-id -> projectId
        options[rawKey] = value;          // e.g., project-id -> 'project-id' (for completeness)
    });

    try {
        switch (command) {
            case 'generate':
                await cli.generateMap(options);
                break;

            case 'projects':
                await cli.listProjects();
                break;

            case 'collections':
                await cli.listCollections();
                break;

            case 'create-collection':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Usage: mindmap create-collection <name> [--description=...]');
                    process.exit(1);
                }
                await cli.createCollection(args[1], options);
                break;

            case 'create-project':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Usage: mindmap create-project <name> [--collection-id=<id>] [--description=...] [--from-file=<nodes.json>]');
                    process.exit(1);
                }
                await cli.createProject(args[1], options);
                break;

            case 'import-json':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Usage: mindmap import-json <file> [--collection-id=<id>]');
                    process.exit(1);
                }
                await cli.importJsonProject(args[1], options);
                break;

            case 'get-project':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Project ID is required');
                    process.exit(1);
                }
                await cli.getProject(args[1], options);
                break;

            case 'get-node':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Node ID is required');
                    process.exit(1);
                }
                await cli.getNode(args[1]);
                break;

            case 'list-tasks':
                await cli.listTasks(options);
                break;

            case 'filter-tasks':
                await cli.filterTasks(options);
                break;

            case 'highest-priority-task':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Project ID is required');
                    console.error('Usage: mindmap highest-priority-task <project-id> [--format=json]');
                    process.exit(1);
                }
                await cli.getHighestPriorityTask(args[1], options);
                break;

            case 'lowest-priority-task':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Project ID is required');
                    console.error('Usage: mindmap lowest-priority-task <project-id> [--format=json]');
                    process.exit(1);
                }
                await cli.getLowestPriorityTask(args[1], options);
                break;

            case 'reset-db':
                // Options: --default-collection-id=<id> --project-name=<name> --description=<text> --no-dummy
                await cli.resetDatabase({
                    defaultCollectionId: options.defaultcollectionid || options.defaultCollectionId || 'default-collection',
                    projectName: options.projectname || options.projectName,
                    description: options.description,
                    noDummy: !!(options.nodummy || options.noDummy)
                });
                break;

            case 'update-status':
                if (!args[1] || !args[2]) {
                    console.error('❌ Usage: mindmap update-status <node-id> <status>');
                    process.exit(1);
                }
                await cli.updateStatus(args[1], args[2]);
                break;

            case 'update-node-json':
                if (!args[1]) {
                    console.error('❌ Usage: mindmap update-node-json <node-id> --file=<path>');
                    process.exit(1);
                }
                await cli.updateNodeJson(args[1], options.file);
                break;

            case 'create-node-json':
                if (!options.file) {
                    console.error('❌ Usage: mindmap create-node-json --file=<path> --project-id=<id>');
                    process.exit(1);
                }
                await cli.createNodeJson(options.file, options);
                break;

            case 'assign-project-collection':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Usage: mindmap assign-project-collection <project-id> [--collection-id=<id>|--remove]');
                    process.exit(1);
                }
                await cli.assignProjectToCollection(args[1], options);
                break;

            case 'add-progress':
                if (!args[1] || !args[2]) {
                    console.error('❌ Usage: mindmap add-progress <node-id> "<message>"');
                    process.exit(1);
                }
                const message = args.slice(2).join(' ');
                await cli.addProgress(args[1], message);
                break;

            case 'search':
                if (!args[1] || args[1].startsWith('--')) {
                    console.error('❌ Search query is required');
                    process.exit(1);
                }
                const query = args.slice(1).find(arg => !arg.startsWith('--'));
                await cli.search(query, options);
                break;

            case 'config':
                await cli.configure(options);
                break;

            case 'help':
            case '--help':
            case '-h':
                cli.showHelp();
                break;

            default:
                console.error(`❌ Unknown command: ${command}`);
                console.log('Use "mindmap help" for available commands');
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run CLI if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = MindMapCLI;