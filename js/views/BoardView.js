/**
 * Board View for Mind Map application
 * Handles kanban-style board visualization
 */

class BoardView {
    constructor() {
        this.boardContainer = null;
        this.columns = {
            pending: null,
            inProgress: null,
            completed: null
        };
        this.initialized = false;
        this._bound = false;
        this.bindEvents();
    }

    _getDataModel() {
        // Prefer global dataModel; fall back to potential mvc container if present
        return window.dataModel || (window.mvc && window.mvc.dataModel) || null;
    }

    initialize(containerId = 'boardContainer') {
        this.boardContainer = document.getElementById(containerId);
        if (!this.boardContainer) {
            console.error(`Board container with ID '${containerId}' not found`);
            return false;
        }

        // Align with index.html IDs
        this.columns.pending = document.getElementById('todoCards');
        this.columns.inProgress = document.getElementById('inProgressCards');
        this.columns.completed = document.getElementById('doneCards');

        if (!this.columns.pending || !this.columns.inProgress || !this.columns.completed) {
            console.error('Board column elements not found (expected #todoCards, #inProgressCards, #doneCards)');
            return false;
        }

        this.initialized = true;
        return true;
    }

    bindEvents() {
        if (this._bound) return;

        // Refresh board when project changes/loads
        window.EventBus?.on(window.EVENTS?.PROJECT_SELECTED, () => {
            // Lazy init in case toggle created the DOM later
            if (!this.initialized) this.initialize('boardContainer');
            if (this.initialized) this.refreshBoard();
        });

        // React to node status changes from other views
        window.EventBus?.on(window.EVENTS?.NODE_STATUS_CHANGED, (payload) => {
            // Ignore our own emissions to avoid loops
            if (payload?.source === 'BoardView') return;
            if (!this.initialized) this.initialize('boardContainer');
            if (this.initialized) this.refreshBoard();
        });

        // Toggle view integration
        window.EventBus?.on(window.EVENTS?.UI_TOGGLE_VIEW, (payload) => {
            if (payload?.view === 'board') {
                if (!this.initialized) this.initialize('boardContainer');
                if (this.initialized) this.refreshBoardWithAnimation();
            }
        });

        // Optional: when data is saved/loaded
        window.EventBus?.on?.(window.EVENTS?.DATA_LOADED, () => {
            if (!this.initialized) this.initialize('boardContainer');
            if (this.initialized) this.refreshBoard();
        });

        this._bound = true;
    }

    populateBoard() {
        if (!this.initialized) {
            console.error('BoardView not initialized');
            return;
        }

        console.log('Populating board...');
        
        // Clear existing cards
        Object.values(this.columns).forEach(column => {
            if (column) column.innerHTML = '';
        });

    // Authoritative model: JSON
    // First, sync any live DOM status changes from MindMapView into the JSON model
    const dm = this._getDataModel();
    try { if (dm) this.syncStatusesFromDOM(dm); } catch (e) { console.warn('syncStatusesFromDOM failed:', e); }

    const jsonData = dm && typeof dm.getJsonData === 'function' ? dm.getJsonData() : null;
    const xmlData = dm && typeof dm.getXmlData === 'function' ? dm.getXmlData() : null;
    const currentFile = dm && typeof dm.getCurrentFile === 'function' ? dm.getCurrentFile() : undefined;

        console.log('xmlData:', xmlData);
        console.log('jsonData:', jsonData);
        console.log('currentFile:', currentFile);

        // Prefer JSON as the authoritative live model
        if (jsonData && jsonData.nodes) {
            this.populateFromJSON(jsonData.nodes);
            return;
        }

        // Fallback to XML if JSON is not present
        if (xmlData) {
            this.populateFromXML(xmlData);
            return;
        }

        // Last resort: derive a flat view from the MindMap DOM
        const domNodes = this._buildFlatNodesFromDom();
        if (domNodes && domNodes.length) {
            this.populateFromJSON(domNodes);
            return;
        }

        // No data
        if (!xmlData && !jsonData) {
            console.log('No data available');
            this.showEmptyBoard();
            return;
        }

    }

    // Synchronize statuses from MindMapView DOM into the JSON model (for live updates)
    syncStatusesFromDOM(dm) {
        const json = dm && typeof dm.getJsonData === 'function' ? dm.getJsonData() : null;
        if (!json || !Array.isArray(json.nodes)) return;
        // Select nodes rendered in MindMapView
        const domNodes = document.querySelectorAll('.node[data-id][data-status]');
        if (!domNodes || domNodes.length === 0) return;
        let updatedAny = false;
        domNodes.forEach(el => {
            const id = el.getAttribute('data-id');
            const status = el.getAttribute('data-status');
            if (!id || !status) return;
            const updated = this._updateStatusInJsonArray(json.nodes, id, status);
            if (updated) updatedAny = true;
        });
        if (updatedAny && dm && typeof dm.setJsonData === 'function') {
            dm.setJsonData(json);
        }
    }

    // Build a flat list of nodes from the MindMap DOM as a fallback
    _buildFlatNodesFromDom() {
        const list = [];
        const els = document.querySelectorAll('.node[data-id]');
        els.forEach(el => {
            const id = el.getAttribute('data-id');
            const status = el.getAttribute('data-status') || 'pending';
            const priority = el.getAttribute('data-priority') || 'medium';
            const titleEl = el.querySelector('.node-title');
            const title = titleEl ? titleEl.textContent.trim() : 'Untitled';
            list.push({ id, title, status, priority, children: [] });
        });
        return list;
    }

    populateFromJSON(jsonNodes) {
        const allNodes = [];
        this.collectJSONNodesRecursively(jsonNodes, allNodes);
        
        console.log('Collected JSON nodes:', allNodes.length);
        
        // Group nodes by status
        const pendingNodes = allNodes.filter(node => !node.status || node.status === 'pending');
        const inProgressNodes = allNodes.filter(node => node.status === 'in-progress');
        const completedNodes = allNodes.filter(node => node.status === 'completed');
        
        console.log('Pending:', pendingNodes.length, 'In Progress:', inProgressNodes.length, 'Completed:', completedNodes.length);
        
        // Populate columns
        this.populateColumn(this.columns.pending, pendingNodes, 'pending');
        this.populateColumn(this.columns.inProgress, inProgressNodes, 'in-progress');
        this.populateColumn(this.columns.completed, completedNodes, 'completed');
        
        // Update counters (if they exist)
        this.updateCounters(pendingNodes.length, inProgressNodes.length, completedNodes.length);
    }

    populateFromXML(xmlData) {
        const allNodes = [];
        const rootData = xmlData.project_plan || xmlData.mindmap || xmlData.root || xmlData;
        this.collectXMLNodesRecursively(rootData, allNodes);
        
        console.log('Collected XML nodes:', allNodes.length);
        
        // Group nodes by status
        const pendingNodes = allNodes.filter(node => !node.status || node.status === 'pending');
        const inProgressNodes = allNodes.filter(node => node.status === 'in-progress');
        const completedNodes = allNodes.filter(node => node.status === 'completed');
        
        console.log('Pending:', pendingNodes.length, 'In Progress:', inProgressNodes.length, 'Completed:', completedNodes.length);
        
        // Populate columns
        this.populateColumn(this.columns.pending, pendingNodes, 'pending');
        this.populateColumn(this.columns.inProgress, inProgressNodes, 'in-progress');
        this.populateColumn(this.columns.completed, completedNodes, 'completed');
        
        // Update counters
        this.updateCounters(pendingNodes.length, inProgressNodes.length, completedNodes.length);
    }

    collectJSONNodesRecursively(jsonNodes, allNodes, parentPath = '') {
        jsonNodes.forEach(node => {
            const title = node.title || 'Untitled';
            const nodePath = parentPath ? `${parentPath} > ${title}` : title;
            
            allNodes.push({
                id: node.id,
                title: title,
                status: node.status || 'pending',
                priority: node.priority,
                startDate: node.startDate,
                endDate: node.endDate,
                comment: node.comment,
                path: nodePath,
                parentPath: parentPath,
                originalNode: node,
                type: 'json'
            });
            
            // Recursively collect children
            if (node.children && node.children.length > 0) {
                this.collectJSONNodesRecursively(node.children, allNodes, nodePath);
            }
        });
    }

    collectXMLNodesRecursively(nodeData, allNodes, parentPath = '') {
        if (nodeData.node) {
            const nodes = Array.isArray(nodeData.node) ? nodeData.node : [nodeData.node];
            nodes.forEach(node => {
                const nodeAttrs = node.$ || {};
                const title = nodeAttrs.title || node.title || 'Untitled';
                const nodePath = parentPath ? `${parentPath} > ${title}` : title;
                
                allNodes.push({
                    id: nodeAttrs.id || node.id,
                    title: title,
                    status: nodeAttrs.status || node.status || 'pending',
                    priority: nodeAttrs.priority || node.priority,
                    assignee: nodeAttrs.assignee || node.assignee,
                    startDate: nodeAttrs.startDate || node.startDate,
                    endDate: nodeAttrs.endDate || node.endDate,
                    comment: node.comment,
                    path: nodePath,
                    parentPath: parentPath,
                    originalNode: node,
                    type: 'xml'
                });
                
                // Recursively collect children
                this.collectXMLNodesRecursively(node, allNodes, nodePath);
            });
        }
    }

    populateColumn(container, nodes, columnType) {
        if (!container) return;
        
        if (nodes.length === 0) {
            container.innerHTML = `<div class="empty-column">No ${columnType} tasks</div>`;
            return;
        }
        
        nodes.forEach(node => {
            const card = this.createTaskCard(node, columnType);
            container.appendChild(card);
        });
    }

    createTaskCard(node, columnType) {
        const card = document.createElement('div');
        card.className = `task-card priority-${node.priority || 'medium'}`;
        card.dataset.nodeId = node.id;
        card.dataset.status = node.status;
        
        const priorityIcon = this.getPriorityIcon(node.priority);
        const statusIcon = this.getStatusIcon(node.status);
        
        card.innerHTML = `
            <div class="card-header">
                <span class="card-priority">${priorityIcon}</span>
                <span class="card-title">${this.escapeHtml(node.title)}</span>
                <span class="card-status">${statusIcon}</span>
            </div>
            ${node.path !== node.title ? `<div class="card-path">${this.escapeHtml(node.parentPath)}</div>` : ''}
            ${node.comment ? `<div class="card-comment">${this.escapeHtml(node.comment)}</div>` : ''}
            ${node.startDate || node.endDate ? `
                <div class="card-dates">
                    ${node.startDate ? `<span class="start-date">🗓️ ${node.startDate}</span>` : ''}
                    ${node.endDate ? `<span class="end-date">🏁 ${node.endDate}</span>` : ''}
                </div>
            ` : ''}
        `;
        // Hint for the interaction
        card.title = 'Ctrl/Cmd + Click: cycle status';

        // Ctrl/Cmd + Click cycles status: pending -> in-progress -> completed -> pending
        const clickHandler = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                const current = card.dataset.status || 'pending';
                const next = this.getNextStatus(current);
                this.changeTaskStatus(node.id, next);
            }
        };
        card.addEventListener('click', clickHandler);

        // On macOS, Ctrl+Click opens context menu; intercept when ctrlKey held
        card.addEventListener('contextmenu', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                // Also handle status cycle here just in case click is suppressed by the browser
                const current = card.dataset.status || 'pending';
                const next = this.getNextStatus(current);
                this.changeTaskStatus(node.id, next);
            }
        });
        
        return card;
    }

    getNextStatus(status) {
        switch (status) {
            case 'pending':
                return 'in-progress';
            case 'in-progress':
                return 'completed';
            case 'completed':
            default:
                return 'pending';
        }
    }

    changeTaskStatus(nodeId, newStatus) {
        console.log(`Changing task ${nodeId} to status ${newStatus}`);

        // Update the card in the board (dataset uses data-node-id)
        const cardEl = this.boardContainer?.querySelector(`[data-node-id="${nodeId}"]`);
        if (cardEl) {
            cardEl.dataset.status = newStatus;
            const statusSpan = cardEl.querySelector('.card-status');
            if (statusSpan) statusSpan.textContent = this.getStatusIcon(newStatus);
        }

        // Update the corresponding MindMap DOM node so fallback derivation and other views stay in sync
        try {
            const mapNode = document.querySelector(`.node[data-id="${nodeId}"]`);
            if (mapNode) {
                // Update data-status and CSS class
                mapNode.setAttribute('data-status', newStatus);
                mapNode.className = mapNode.className.replace(/status-\w+/, `status-${newStatus}`);
                // Update its status icon if present, using MindMapView icons for consistency
                const statusIcon = mapNode.querySelector('.icon-status');
                if (statusIcon) {
                    const getMMIcon = window.MindMapView?.getStatusIcon?.bind(window.MindMapView);
                    statusIcon.textContent = getMMIcon ? getMMIcon(newStatus) : this.getStatusIcon(newStatus);
                    statusIcon.title = `Status: ${newStatus}`;
                }
            }
        } catch (e) {
            console.warn('Failed to update MindMap DOM node status:', e);
        }

        // Move the card to the appropriate column immediately for instant UX feedback
        try {
            if (cardEl) {
                const targetContainer = newStatus === 'completed'
                    ? this.columns.completed
                    : newStatus === 'in-progress'
                        ? this.columns.inProgress
                        : this.columns.pending;
                if (targetContainer && cardEl.parentElement !== targetContainer) {
                    targetContainer.appendChild(cardEl);
                }
            }
        } catch (e) {
            console.warn('Failed to move card element:', e);
        }

        // Update underlying data model so switch between views reflects latest state
        const dm = this._getDataModel();
        try {
            if (dm && typeof dm.updateNodeStatus === 'function') {
                dm.updateNodeStatus(nodeId, newStatus);
            } else {
                const json = dm && typeof dm.getJsonData === 'function' ? dm.getJsonData() : null;
                if (json && Array.isArray(json.nodes)) {
                    const updated = this._updateStatusInJsonArray(json.nodes, nodeId, newStatus);
                    if (updated && dm && typeof dm.setJsonData === 'function') {
                        dm.setJsonData(json);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to update model status:', e);
        }

        // Optionally trigger a save if available
        if (typeof window.autoSave === 'function') {
            try { window.autoSave(); } catch (e) { console.warn('autoSave failed:', e); }
        }

        // Update counters immediately based on DOM, to reflect move without waiting
        try {
            const pCount = this.columns.pending?.querySelectorAll('.task-card').length || 0;
            const iCount = this.columns.inProgress?.querySelectorAll('.task-card').length || 0;
            const cCount = this.columns.completed?.querySelectorAll('.task-card').length || 0;
            this.updateCounters(pCount, iCount, cCount);
        } catch (e) {
            console.warn('Counter update failed:', e);
        }

        // Recompute columns from the latest model snapshot
        setTimeout(() => this.populateBoard(), 100);

        // Notify others
        try {
            window.EventBus?.emit(window.EVENTS?.NODE_STATUS_CHANGED, {
                nodeIds: [nodeId],
                newStatus,
                source: 'BoardView'
            });
        } catch (e) {
            console.warn('EventBus emit failed:', e);
        }
    }

    // Helper: recursively update status by id in JSON nodes
    _updateStatusInJsonArray(nodes, nodeId, newStatus) {
        for (const n of nodes) {
            if (n && n.id === nodeId) {
                n.status = newStatus;
                return true;
            }
            if (n && Array.isArray(n.children) && this._updateStatusInJsonArray(n.children, nodeId, newStatus)) {
                return true;
            }
        }
        return false;
    }

    getPriorityIcon(priority) {
        switch (priority) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '🟡';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'completed': return '✅';
            case 'in-progress': return '🟡';
            default: return '🔲';
        }
    }

    showEmptyBoard() {
        Object.values(this.columns).forEach(column => {
            if (column) {
                column.innerHTML = '<div class="empty-column">No tasks available</div>';
            }
        });
    }

    updateCounters(pendingCount, inProgressCount, completedCount) {
        // Board view counters (match index.html)
        const todoCounter = document.getElementById('todoCount');
        const inProgCounter = document.getElementById('inProgressBoardCount');
        const doneCounter = document.getElementById('doneCount');

        if (todoCounter) todoCounter.textContent = pendingCount;
        if (inProgCounter) inProgCounter.textContent = inProgressCount;
        if (doneCounter) doneCounter.textContent = completedCount;
    }

    refreshBoard() {
        this.populateBoard();
    }

    refreshBoardWithAnimation() {
        // Add fade out animation
        if (this.boardContainer) {
            this.boardContainer.style.opacity = '0.5';
            setTimeout(() => {
                this.populateBoard();
                this.boardContainer.style.opacity = '1';
            }, 200);
        } else {
            this.populateBoard();
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isVisible() {
        return this.boardContainer && this.boardContainer.style.display !== 'none';
    }

    show() {
        if (this.boardContainer) {
            this.boardContainer.style.display = 'block';
        }
    }

    hide() {
        if (this.boardContainer) {
            this.boardContainer.style.display = 'none';
        }
    }
}

// Create singleton instance
const boardView = new BoardView();

// Export for backward compatibility
window.boardView = boardView;
window.populateBoard = () => boardView.populateBoard();
window.refreshBoard = () => boardView.refreshBoard();
window.refreshBoardWithAnimation = () => boardView.refreshBoardWithAnimation();

// Assign to window for global access
window.BoardView = BoardView;