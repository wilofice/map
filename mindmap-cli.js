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
        this.baseUrl = process.env.MINDMAP_API_URL || 'http://localhost:3333';
        this.configFile = path.join(process.cwd(), '.mindmap-cli-config.json');
        this.loadConfig();
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

            return await response.json();
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`Cannot connect to MindMap server at ${this.baseUrl}. Make sure the server is running.`);
            }
            throw error;
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
  projects                     List all projects
  get-project <id>             Get project details with context
  get-node <id>                Get node details with progress history
  list-tasks                   List pending tasks (AI task queue)
  update-status <id> <status>  Update node status (pending|in-progress|completed)
  add-progress <id> <message>  Add progress message to node
  search <query>               Search for tasks/nodes
  config                       Configure CLI settings
  help                         Show this help message

OPTIONS:
  --priority=<high|medium|low>  Filter by priority
  --status=<status>            Filter by status
  --limit=<number>             Limit number of results
  --project-id=<id>            Filter by project
  --format=<json|human>        Output format
  --show-nodes                 Show nodes in project details

CONFIGURATION:
  mindmap config --api-url=<url>     Set API endpoint
  mindmap config --list              Show current config

EXAMPLES:
  mindmap projects
  mindmap list-tasks --priority=high --limit=5
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

    // Parse options
    args.slice(1).forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            options[key.replace(/-/g, '')] = value || true;
        }
    });

    try {
        switch (command) {
            case 'projects':
                await cli.listProjects();
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

            case 'update-status':
                if (!args[1] || !args[2]) {
                    console.error('❌ Usage: mindmap update-status <node-id> <status>');
                    process.exit(1);
                }
                await cli.updateStatus(args[1], args[2]);
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