/**
 * MindMapView - Handles mind map rendering and interaction
 */
class MindMapView {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        window.EventBus?.on(window.EVENTS?.PROJECT_SELECTED, this.handleProjectSelected.bind(this));
    }

    initialize() {
        this.container = document.getElementById('mindMapContainer');
    }

    handleProjectSelected(data) {
        const { project, nodes } = data;
        console.log('🗺️ MindMapView: Rendering project', project?.name, 'with', nodes?.length, 'nodes');
        
        if (this.container && nodes && nodes.length > 0) {
            this.renderMindMap(nodes);
        } else {
            this.showEmptyState(project);
        }
    }

    renderMindMap(nodes) {
        if (!nodes || !Array.isArray(nodes)) {
            console.error('Invalid nodes data:', nodes);
            return;
        }

        // Build hierarchical structure from flat nodes array
        const nodeMap = new Map();
        const rootNodes = [];

        // First pass: create node map
        nodes.forEach(node => {
            nodeMap.set(node.id, { ...node, children: [] });
        });

        // Second pass: build hierarchy
        nodes.forEach(node => {
            if (node.parent_id && nodeMap.has(node.parent_id)) {
                nodeMap.get(node.parent_id).children.push(nodeMap.get(node.id));
            } else {
                rootNodes.push(nodeMap.get(node.id));
            }
        });

        // Sort nodes by sort_order and depth_level
        rootNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        console.log('🌳 Rendering', rootNodes.length, 'root nodes');
        
        const renderedHtml = rootNodes.map(node => this.renderNode(node)).join('');
        this.container.innerHTML = renderedHtml;

        // Add event listeners for node interactions
        this.attachEventListeners();
    }

    renderNode(node, depth = 0) {
        if (!node) return '';

        const hasChildren = node.children && node.children.length > 0;
        const hasComment = node.content && node.content.trim() !== '';
        const hasCode = node.code_content && node.code_content.trim() !== '';
        const hasTaskPrompt = node.task_prompt && node.task_prompt.trim() !== '';
        const hasCliCommand = node.cli_command && node.cli_command.trim() !== '';

        let nodeHtml = `
            <div class="node priority-${node.priority || 'medium'} status-${node.status || 'pending'}" 
                 data-priority="${node.priority || 'medium'}" 
                 data-status="${node.status || 'pending'}" 
                 data-id="${node.id}">
                <div class="node-wrapper ${hasComment ? 'has-comment' : ''} ${hasCode ? 'has-code' : ''} ${hasTaskPrompt ? 'has-task-prompt' : ''} ${hasCliCommand ? 'has-cli-command' : ''}" 
                     data-id="${node.id}">
                    <div class="node-content" style="--original-bg: ${this.getNodeBackground(node.priority, node.status)};">
                        ${hasChildren ? '<span class="node-toggle">–</span>' : '<span class="node-toggle">•</span>'}
                        <span class="node-icon icon-status" title="Status: ${node.status}">${this.getStatusIcon(node.status)}</span>
                        <span class="node-title">${this.escapeHtml(node.title || 'Untitled')}</span>
                        <span class="node-icon icon-date" title="Toggle Dates">📅</span>
                        <span class="node-icon icon-comment" title="Toggle Comment" style="display: ${hasComment ? 'inline' : 'none'};">💬</span>
                        <span class="node-icon icon-code" title="Toggle Code" style="display: ${hasCode ? 'inline' : 'none'};">💻</span>
                        <span class="node-icon icon-task" title="Toggle Task Prompt" style="display: ${hasTaskPrompt ? 'inline' : 'none'};">🤖</span>
                        <span class="node-icon icon-cli" title="Toggle CLI Command" style="display: ${hasCliCommand ? 'inline' : 'none'};">⚡</span>
                        <span class="node-icon icon-add" title="Add Child Node">➕</span>
                        <span class="node-icon icon-delete" title="Delete Node">🗑️</span>
                    </div>

                    <!-- Date controls -->
                    <div class="node-dates" style="display: none;">
                        <span>
                            <span class="date-value" data-type="startDate">${node.start_date || ''}</span>
                            <span class="date-value" data-type="endDate">${node.end_date || ''}</span>
                        </span>
                        <div class="days-spent-control">
                            <button class="days-spent-btn minus">-</button>
                            <span class="days-spent-value">${node.days_spent || 0}</span>
                            <button class="days-spent-btn plus">+</button>
                            <span>days</span>
                        </div>
                    </div>

                    <!-- Comment section -->
                    ${hasComment ? `<div class="node-comment">${this.escapeHtml(node.content)}</div>` : ''}

                    <!-- Code section -->
                    ${hasCode ? this.renderCodeBlock(node) : ''}

                    <!-- Task prompt section -->
                    ${hasTaskPrompt ? this.renderTaskPromptBlock(node.task_prompt) : ''}

                    <!-- CLI command section -->
                    ${hasCliCommand ? this.renderCliCommandBlock(node.cli_command) : ''}
                </div>

                <!-- Children container -->
                ${hasChildren ? `<div class="node-parent">${node.children.map(child => this.renderNode(child, depth + 1)).join('')}</div>` : ''}
            </div>
        `;

        return nodeHtml;
    }

    renderCodeBlock(node) {
        const language = node.code_language || 'text';
        const content = node.code_content || '';

        return `
            <div class="node-code">
                <div class="code-header">
                    <span class="code-language">${language.toUpperCase()}</span>
                    <button class="copy-btn" data-content="${this.escapeHtml(content)}">Copy</button>
                </div>
                <pre class="language-${language}" tabindex="0"><code class="language-${language}">${this.escapeHtml(content)}</code></pre>
            </div>
        `;
    }

    renderTaskPromptBlock(taskPrompt) {
        return `
            <div class="node-task-prompt">
                <div class="task-prompt-header">
                    <span class="task-prompt-label">🤖 Task Prompt</span>
                    <button class="copy-btn" data-content="${this.escapeHtml(taskPrompt)}">Copy</button>
                </div>
                <div class="task-prompt-content">${this.escapeHtml(taskPrompt)}</div>
            </div>
        `;
    }

    renderCliCommandBlock(cliCommand) {
        return `
            <div class="node-cli-command">
                <div class="cli-command-header">
                    <span class="cli-command-label">⚡ CLI Command</span>
                    <button class="copy-btn" data-content="${this.escapeHtml(cliCommand)}">Copy</button>
                </div>
                <div class="cli-command-content"><code>${this.escapeHtml(cliCommand)}</code></div>
            </div>
        `;
    }

    showEmptyState(project) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <h3>📝 ${project?.name || 'No Project Selected'}</h3>
                    <p>${project?.description || 'No description available'}</p>
                    <p>This project appears to be empty or has no nodes yet.</p>
                    <div style="margin-top: 20px;">
                        <button class="btn btn-primary" onclick="location.reload()">🔄 Reload</button>
                    </div>
                </div>
            `;
        }
    }

    attachEventListeners() {
        if (!this.container) return;

        // Toggle node visibility
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('node-toggle')) {
                const nodeWrapper = e.target.closest('.node');
                const childContainer = nodeWrapper?.querySelector('.node-parent');
                if (childContainer) {
                    const isCollapsed = childContainer.style.display === 'none';
                    childContainer.style.display = isCollapsed ? 'block' : 'none';
                    e.target.textContent = isCollapsed ? '–' : '+';
                }
            }

            // Toggle date display
            if (e.target.classList.contains('icon-date')) {
                const nodeWrapper = e.target.closest('.node-wrapper');
                const dateContainer = nodeWrapper?.querySelector('.node-dates');
                if (dateContainer) {
                    const isVisible = dateContainer.style.display !== 'none';
                    dateContainer.style.display = isVisible ? 'none' : 'block';
                }
            }

            // Toggle comment display  
            if (e.target.classList.contains('icon-comment')) {
                const nodeWrapper = e.target.closest('.node-wrapper');
                const commentContainer = nodeWrapper?.querySelector('.node-comment');
                if (commentContainer) {
                    const isVisible = commentContainer.style.display !== 'none';
                    commentContainer.style.display = isVisible ? 'none' : 'block';
                }
            }

            // Copy functionality
            if (e.target.classList.contains('copy-btn')) {
                const content = e.target.getAttribute('data-content');
                if (content) {
                    navigator.clipboard.writeText(content).then(() => {
                        e.target.textContent = 'Copied!';
                        setTimeout(() => e.target.textContent = 'Copy', 2000);
                    });
                }
            }
        });
    }

    getStatusIcon(status) {
        const icons = {
            'pending': '⏳',
            'in-progress': '🔄', 
            'completed': '✅',
            'blocked': '🚫',
            'cancelled': '❌'
        };
        return icons[status] || '⏳';
    }

    getNodeBackground(priority, status) {
        // Return CSS color based on priority and status
        const priorityColors = {
            'low': '#e8f5e8',
            'medium': '#fff3cd', 
            'high': '#f8d7da',
            'critical': '#d1ecf1'
        };
        return priorityColors[priority] || priorityColors['medium'];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    render(data) {
        this.currentData = data;
        if (data && data.nodes) {
            this.renderMindMap(data.nodes);
        }
    }
}

// Create global MindMapView instance
window.MindMapView = new MindMapView();
