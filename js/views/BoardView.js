/**
 * Board View for Mind Map application
 * Handles kanban-style board visualization
 */

import { dataModel } from '../models/DataModel.js';

export class BoardView {
    constructor() {
        this.boardContainer = null;
        this.columns = {
            pending: null,
            inProgress: null,
            completed: null
        };
        this.initialized = false;
    }

    initialize(containerId = 'boardContainer') {
        this.boardContainer = document.getElementById(containerId);
        if (!this.boardContainer) {
            console.error(`Board container with ID '${containerId}' not found`);
            return false;
        }

        this.columns.pending = document.getElementById('pendingColumn')?.querySelector('.column-content');
        this.columns.inProgress = document.getElementById('inProgressColumn')?.querySelector('.column-content');
        this.columns.completed = document.getElementById('completedColumn')?.querySelector('.column-content');

        if (!this.columns.pending || !this.columns.inProgress || !this.columns.completed) {
            console.error('Board column elements not found');
            return false;
        }

        this.initialized = true;
        return true;
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

        const xmlData = dataModel.getXmlData();
        const jsonData = dataModel.getJsonData();
        const currentFile = dataModel.getCurrentFile();

        console.log('xmlData:', xmlData);
        console.log('jsonData:', jsonData);
        console.log('currentFile:', currentFile);

        // Handle JSON data
        if (jsonData && jsonData.nodes) {
            this.populateFromJSON(jsonData.nodes);
            return;
        }

        // Handle XML data
        if (!xmlData) {
            console.log('No data available');
            this.showEmptyBoard();
            return;
        }

        this.populateFromXML(xmlData);
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
            <div class="card-actions">
                <button class="card-btn" onclick="boardView.changeTaskStatus('${node.id}', 'pending')" title="Move to Pending">🔲</button>
                <button class="card-btn" onclick="boardView.changeTaskStatus('${node.id}', 'in-progress')" title="Move to In Progress">🟡</button>
                <button class="card-btn" onclick="boardView.changeTaskStatus('${node.id}', 'completed')" title="Move to Completed">✅</button>
            </div>
        `;
        
        return card;
    }

    changeTaskStatus(nodeId, newStatus) {
        console.log(`Changing task ${nodeId} to status ${newStatus}`);
        
        // Find the node in the DOM and update its status
        const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.dataset.status = newStatus;
            
            // Update the status icon
            const statusIcon = nodeElement.querySelector('.status-icon');
            if (statusIcon) {
                statusIcon.textContent = this.getStatusIcon(newStatus);
            }
            
            // Trigger auto-save
            if (window.autoSave) {
                window.autoSave();
            }
            
            // Refresh the board
            setTimeout(() => {
                this.populateBoard();
            }, 100);
        }
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
        const pendingCounter = document.getElementById('pendingCount');
        const inProgressCounter = document.getElementById('inProgressCount');
        const completedCounter = document.getElementById('completedCount');
        
        if (pendingCounter) pendingCounter.textContent = pendingCount;
        if (inProgressCounter) inProgressCounter.textContent = inProgressCount;
        if (completedCounter) completedCounter.textContent = completedCount;
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

// Create and export singleton instance
export const boardView = new BoardView();

// Export for backward compatibility
window.boardView = boardView;
window.populateBoard = () => boardView.populateBoard();
window.refreshBoard = () => boardView.refreshBoard();
window.refreshBoardWithAnimation = () => boardView.refreshBoardWithAnimation();

export default BoardView;