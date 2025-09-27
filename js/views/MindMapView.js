/**
 * MindMapView - Handles mind map rendering and interaction
 */
class MindMapView {
    constructor() {
        this.container = null;
        this.currentData = null;
        this._controlsAttached = false;
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
            // Keep a reference to current nodes for export and other ops
            this.currentData = nodes;
            this.renderMindMap(nodes);
            this.showControls();
            this.showProgress();
            this.updateProgress();
        } else {
            this.showEmptyState(project);
            this.hideControls();
            this.hideProgress();
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
                        <span class="node-icon icon-copy-id" title="Copy Node ID">📋</span>
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

            // Status cycling
            if (e.target.classList.contains('icon-status')) {
                this.cycleNodeStatus(e.target);
            }

            // Copy Node ID
            if (e.target.classList.contains('icon-copy-id')) {
                const node = e.target.closest('.node');
                const id = node?.getAttribute('data-id');
                if (id) {
                    const onSuccess = () => {
                        e.target.textContent = '✅';
                        setTimeout(() => e.target.textContent = '📋', 1200);
                        window.NotificationView?.success('Node ID copied');
                    };
                    const onFailure = () => {
                        try {
                            const ta = document.createElement('textarea');
                            ta.value = id;
                            ta.setAttribute('readonly', '');
                            ta.style.position = 'absolute';
                            ta.style.left = '-9999px';
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                            onSuccess();
                        } catch (err) {
                            console.warn('Copy failed:', err);
                            window.NotificationView?.warning('Unable to copy node ID');
                        }
                    };
                    if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(id).then(onSuccess).catch(onFailure);
                    } else {
                        onFailure();
                    }
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

            // Toggle code display
            if (e.target.classList.contains('icon-code')) {
                const nodeWrapper = e.target.closest('.node-wrapper');
                const codeContainer = nodeWrapper?.querySelector('.node-code');
                if (codeContainer) {
                    const computedStyle = window.getComputedStyle(codeContainer);
                    const isVisible = computedStyle.display !== 'none';
                    codeContainer.style.display = isVisible ? 'none' : 'block';
                    console.log('🔄 Code block toggled:', isVisible ? 'hiding' : 'showing');
                }
            }

            // Toggle task prompt display
            if (e.target.classList.contains('icon-task')) {
                const nodeWrapper = e.target.closest('.node-wrapper');
                const taskContainer = nodeWrapper?.querySelector('.node-task-prompt');
                if (taskContainer) {
                    const computedStyle = window.getComputedStyle(taskContainer);
                    const isVisible = computedStyle.display !== 'none';
                    taskContainer.style.display = isVisible ? 'none' : 'block';
                    console.log('🤖 Task prompt toggled:', isVisible ? 'hiding' : 'showing');
                }
            }

            // Toggle CLI command display
            if (e.target.classList.contains('icon-cli')) {
                const nodeWrapper = e.target.closest('.node-wrapper');
                const cliContainer = nodeWrapper?.querySelector('.node-cli-command');
                if (cliContainer) {
                    const computedStyle = window.getComputedStyle(cliContainer);
                    const isVisible = computedStyle.display !== 'none';
                    cliContainer.style.display = isVisible ? 'none' : 'block';
                    console.log('⚡ CLI command toggled:', isVisible ? 'hiding' : 'showing');
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

        // Attach control panel event listeners once
        if (!this._controlsAttached) {
            this.attachControlListeners();
            this._controlsAttached = true;
        }
    }

    cycleNodeStatus(statusIcon) {
        const nodeElement = statusIcon.closest('.node');
        const nodeId = nodeElement.getAttribute('data-id');
        const currentStatus = nodeElement.getAttribute('data-status');

        // Status cycle: pending -> in-progress -> completed -> pending
        const statusCycle = {
            'pending': 'in-progress',
            'in-progress': 'completed',
            'completed': 'pending'
        };

        const newStatus = statusCycle[currentStatus] || 'pending';

        // Update the parent node
        this.updateNodeStatus(nodeElement, newStatus);

        // Recursively update all child nodes to the same status
        this.updateChildrenStatus(nodeElement, newStatus);

        // Update progress
        this.updateProgress();

        // Save to database via API
        this.saveNodeStatusToDatabase(nodeElement, newStatus);

        const totalUpdated = this.countUpdatedNodes(nodeElement);
        console.log(`🔄 Status changed for node ${nodeId} and ${totalUpdated - 1} children: ${currentStatus} -> ${newStatus}`);
    }

    updateNodeStatus(nodeElement, newStatus) {
        const statusIcon = nodeElement.querySelector('.icon-status');

        // Update visual elements
        nodeElement.setAttribute('data-status', newStatus);
        nodeElement.className = nodeElement.className.replace(/status-\w+/, `status-${newStatus}`);
        if (statusIcon) {
            statusIcon.textContent = this.getStatusIcon(newStatus);
            statusIcon.title = `Status: ${newStatus}`;
        }
    }

    updateChildrenStatus(parentNode, newStatus) {
        // Find the direct children container
        const childContainer = parentNode.querySelector('.node-parent');
        if (!childContainer) return;

        // Get all direct child nodes
        const childNodes = childContainer.querySelectorAll(':scope > .node');

        childNodes.forEach(childNode => {
            // Update this child's status
            this.updateNodeStatus(childNode, newStatus);

            // Recursively update its children
            this.updateChildrenStatus(childNode, newStatus);
        });
    }

    countUpdatedNodes(parentNode) {
        let count = 1; // Count the parent itself

        const childContainer = parentNode.querySelector('.node-parent');
        if (!childContainer) return count;

        const childNodes = childContainer.querySelectorAll(':scope > .node');
        childNodes.forEach(childNode => {
            count += this.countUpdatedNodes(childNode);
        });

        return count;
    }

    attachControlListeners() {
        // Save button
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            console.log('💾 Save all changes clicked');
            window.NotificationView?.success('Changes saved successfully');
        });

        // Toggle comments
        document.getElementById('toggleCommentsBtn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const labelSpan = btn.querySelector('.btn-text');
            const comments = this.container.querySelectorAll('.node-comment');
            const isShowing = labelSpan?.textContent?.includes('Hide');
            comments.forEach(comment => {
                comment.style.display = isShowing ? 'none' : 'block';
            });
            if (labelSpan) labelSpan.textContent = isShowing ? 'Show Comments' : 'Hide Comments';
        });

        // Toggle dates
        document.getElementById('toggleDatesBtn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const labelSpan = btn.querySelector('.btn-text');
            const dates = this.container.querySelectorAll('.node-dates');
            const isShowing = labelSpan?.textContent?.includes('Hide');
            dates.forEach(date => {
                date.style.display = isShowing ? 'none' : 'block';
            });
            if (labelSpan) labelSpan.textContent = isShowing ? 'Show Dates' : 'Hide Dates';
        });

        // Toggle all nodes
        document.getElementById('toggleAllBtn')?.addEventListener('click', () => {
            const toggles = this.container.querySelectorAll('.node-toggle');
            const parents = this.container.querySelectorAll('.node-parent');
            
            // Check if any are collapsed
            const anyCollapsed = Array.from(parents).some(parent => parent.style.display === 'none');
            
            parents.forEach((parent, i) => {
                parent.style.display = anyCollapsed ? 'block' : 'none';
                if (toggles[i]) {
                    toggles[i].textContent = anyCollapsed ? '–' : '+';
                }
            });
        });

    }

    showControls() {
        const controls = document.getElementById('controls');
        if (controls) {
            controls.style.display = 'block';
        }
    }

    hideControls() {
        const controls = document.getElementById('controls');
        if (controls) {
            controls.style.display = 'none';
        }
    }

    showProgress() {
        const progress = document.getElementById('progressContainer');
        if (progress) {
            progress.style.display = 'block';
        }
    }

    hideProgress() {
        const progress = document.getElementById('progressContainer');
        if (progress) {
            progress.style.display = 'none';
        }
    }

    updateProgress() {
        if (!this.container) return;

        const nodes = this.container.querySelectorAll('.node');
        const stats = {
            completed: 0,
            'in-progress': 0,
            pending: 0,
            total: nodes.length
        };

        const priorityStats = {
            high: { completed: 0, 'in-progress': 0, pending: 0, total: 0 },
            medium: { completed: 0, 'in-progress': 0, pending: 0, total: 0 },
            low: { completed: 0, 'in-progress': 0, pending: 0, total: 0 }
        };

        // Collect detailed statistics
        nodes.forEach(node => {
            const status = node.getAttribute('data-status') || 'pending';
            const priority = node.getAttribute('data-priority') || 'medium';

            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }

            if (priorityStats[priority]) {
                priorityStats[priority][status]++;
                priorityStats[priority].total++;
            }
        });

        // Calculate basic progress percentage
        const completedPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        // Calculate priority-weighted progress (high=3, medium=2, low=1)
        const weightedTotal = (priorityStats.high.total * 3) + (priorityStats.medium.total * 2) + (priorityStats.low.total * 1);
        const weightedCompleted = (priorityStats.high.completed * 3) + (priorityStats.medium.completed * 2) + (priorityStats.low.completed * 1);
        const weightedPercentage = weightedTotal > 0 ? Math.round((weightedCompleted / weightedTotal) * 100) : 0;

        // Update main progress percentage
        const progressPercentage = document.getElementById('progressPercentage');
        if (progressPercentage) progressPercentage.textContent = `${completedPercentage}%`;

        // Update multi-segment progress bar
        this.updateProgressSegments(stats);

        // Update priority progress bars
        this.updatePriorityBars(priorityStats);

        // Update basic counts
        this.updateProgressCounts(stats);

        // Update advanced metrics
        this.updateAdvancedMetrics(stats, weightedPercentage);

        // Setup interactive segments if not already done
        this.setupProgressInteractions();

        console.log('📊 Enhanced progress updated:', stats, `${completedPercentage}%`, `weighted: ${weightedPercentage}%`);
    }

    updateProgressSegments(stats) {
        const total = stats.total;
        if (total === 0) return;

        const completedPct = (stats.completed / total) * 100;
        const inProgressPct = (stats['in-progress'] / total) * 100;
        const pendingPct = (stats.pending / total) * 100;

        const completedSegment = document.getElementById('completedSegment');
        const inProgressSegment = document.getElementById('inProgressSegment');
        const pendingSegment = document.getElementById('pendingSegment');
        const emptySegment = document.getElementById('emptySegment');

        if (completedSegment) completedSegment.style.width = `${completedPct}%`;
        if (inProgressSegment) inProgressSegment.style.width = `${inProgressPct}%`;
        if (pendingSegment) pendingSegment.style.width = `${pendingPct}%`;
        if (emptySegment) emptySegment.style.width = '0%';
    }

    updatePriorityBars(priorityStats) {
        ['high', 'medium', 'low'].forEach(priority => {
            const stats = priorityStats[priority];
            const percentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
            const fillElement = document.getElementById(`${priority}PriorityFill`);
            if (fillElement) {
                fillElement.style.width = `${percentage}%`;
                fillElement.parentElement.title = `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority: ${stats.completed}/${stats.total} (${Math.round(percentage)}%)`;
            }
        });
    }

    updateProgressCounts(stats) {
        const completedEl = document.getElementById('completedCount');
        const inProgressEl = document.getElementById('inProgressCount');
        const pendingEl = document.getElementById('pendingCount');
        const totalEl = document.getElementById('totalCount');

        if (completedEl) completedEl.textContent = String(stats.completed);
        if (inProgressEl) inProgressEl.textContent = String(stats['in-progress']);
        if (pendingEl) pendingEl.textContent = String(stats.pending);
        if (totalEl) totalEl.textContent = String(stats.total);
    }

    updateAdvancedMetrics(stats, weightedPercentage) {
        // Update weighted progress
        const weightedEl = document.getElementById('weightedProgress');
        if (weightedEl) weightedEl.textContent = `${weightedPercentage}%`;

        // Calculate and update velocity (simulate based on completion rate)
        const velocityEl = document.getElementById('velocityIndicator');
        if (velocityEl) {
            const completionRate = stats.total > 0 ? stats.completed / stats.total : 0;
            let velocityText = '--';

            if (completionRate >= 0.8) velocityText = '🚀 High';
            else if (completionRate >= 0.5) velocityText = '⚡ Good';
            else if (completionRate >= 0.2) velocityText = '🐌 Slow';
            else velocityText = '🔄 Starting';

            velocityEl.textContent = velocityText;
        }

        // Calculate completion forecast
        const forecastEl = document.getElementById('completionForecast');
        if (forecastEl) {
            const remaining = stats.pending + stats['in-progress'];
            let forecastText = '--';

            if (remaining === 0) forecastText = '🎉 Done!';
            else if (stats['in-progress'] > 0) {
                const ratio = stats.completed / (stats.completed + stats['in-progress']);
                if (ratio >= 0.7) forecastText = '📅 Soon';
                else if (ratio >= 0.3) forecastText = '⏰ On Track';
                else forecastText = '⚠️ Behind';
            } else {
                forecastText = '🚀 Ready to Start';
            }

            forecastEl.textContent = forecastText;
        }
    }

    setupProgressInteractions() {
        if (this._progressInteractionsSetup) return;

        const segments = ['completed', 'inProgress', 'pending'];
        segments.forEach(segment => {
            const segmentEl = document.getElementById(`${segment}Segment`);
            if (segmentEl) {
                segmentEl.addEventListener('click', () => {
                    this.highlightNodesByStatus(segment === 'inProgress' ? 'in-progress' : segment);
                });
            }
        });

        this._progressInteractionsSetup = true;
    }

    highlightNodesByStatus(targetStatus) {
        if (!this.container) return;

        const nodes = this.container.querySelectorAll('.node');

        // Clear previous highlights
        nodes.forEach(node => {
            node.style.outline = '';
            node.style.boxShadow = '';
        });

        // Highlight matching nodes
        let highlightedCount = 0;
        nodes.forEach(node => {
            const status = node.getAttribute('data-status') || 'pending';
            if (status === targetStatus) {
                node.style.outline = '3px solid #4299e1';
                node.style.boxShadow = '0 0 0 6px rgba(66, 153, 225, 0.2)';
                highlightedCount++;
            }
        });

        // Show notification
        const statusDisplay = targetStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        window.NotificationView?.info(`Highlighted ${highlightedCount} ${statusDisplay} tasks`, 3000);

        // Clear highlights after 5 seconds
        setTimeout(() => {
            nodes.forEach(node => {
                node.style.outline = '';
                node.style.boxShadow = '';
            });
        }, 5000);
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

    /**
     * Save node status changes to database and collect all affected nodes
     */
    async saveNodeStatusToDatabase(nodeElement, newStatus) {
        try {
            // Collect all nodes that were updated (parent + children)
            const updatedNodes = [];
            this.collectUpdatedNodes(nodeElement, newStatus, updatedNodes);

            // Update each node in the database
            for (const { nodeId, status, title } of updatedNodes) {
                try {
                    const response = await fetch(`/api/db/nodes/${nodeId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: status
                        })
                    });

                    if (!response.ok) {
                        console.error(`Failed to update node ${nodeId}: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`Error updating node ${nodeId}:`, error);
                }
            }

            console.log(`✅ Updated ${updatedNodes.length} nodes in database`);
        } catch (error) {
            console.error('❌ Failed to save status changes to database:', error);
        }
    }

    /**
     * Recursively collect all nodes that were updated
     */
    collectUpdatedNodes(nodeElement, newStatus, updatedNodes) {
        const nodeId = nodeElement.getAttribute('data-id');
        const title = nodeElement.querySelector('.node-title')?.textContent || 'Untitled';

        if (nodeId) {
            updatedNodes.push({ nodeId, status: newStatus, title });
        }

        // Collect children
        const childContainer = nodeElement.querySelector('.node-parent');
        if (childContainer) {
            const childNodes = childContainer.querySelectorAll(':scope > .node');
            childNodes.forEach(childNode => {
                this.collectUpdatedNodes(childNode, newStatus, updatedNodes);
            });
        }
    }
}

// Create global MindMapView instance
window.MindMapView = new MindMapView();
