/**
 * UI Renderer for Mind Map application
 * Handles mind map rendering and node visualization
 */

import { dataModel } from '../models/DataModel.js';
import { updateProgressBar } from '../progress-tracker.js';
import { NodeManager } from '../node-manager.js';

export class UIRenderer {
    constructor() {
        this.container = null;
        this.currentData = null;
    }

    initialize(containerId = 'mindMapContainer') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID '${containerId}' not found`);
            return false;
        }
        return true;
    }

    renderMindMap(data = null) {
        if (!this.container) {
            console.error('UIRenderer not initialized');
            return;
        }

        // Use provided data or fall back to global data
        const xmlData = data || dataModel.getXmlData();
        const jsonData = data || dataModel.getJsonData();
        
        this.container.innerHTML = '';
        
        // Handle JSON data
        if (jsonData && jsonData.nodes) {
            this.renderJSONNodes(jsonData.nodes);
            updateProgressBar();
            return;
        }
        
        // Handle XML data
        if (!xmlData || !xmlData.project_plan || !xmlData.project_plan.node) {
            this.container.innerHTML = '<div class="empty-state">No data to display</div>';
            updateProgressBar();
            return;
        }
        
        // Ensure nodes is an array
        const nodes = Array.isArray(xmlData.project_plan.node) 
            ? xmlData.project_plan.node 
            : [xmlData.project_plan.node];
        
        nodes.forEach(nodeData => {
            this.renderXMLNode(nodeData, this.container);
        });
        
        // Update progress bar after rendering all nodes
        updateProgressBar();
    }

    renderJSONNodes(jsonNodes) {
        jsonNodes.forEach(nodeData => {
            this.renderJSONNode(nodeData, this.container);
        });
    }

    renderJSONNode(nodeData, parentElement) {
        const priority = nodeData.priority || 'medium';
        const status = nodeData.status || 'pending';
        const nodeId = nodeData.id || NodeManager.generateId();
        const title = nodeData.title || 'New Node';
        
        const nodeElement = this.createNodeElement({
            id: nodeId,
            title: title,
            priority: priority,
            status: status,
            comment: nodeData.comment || '',
            startDate: nodeData.startDate || '',
            endDate: nodeData.endDate || '',
            daysSpent: nodeData.daysSpent || 0,
            code: nodeData.code || null,
            taskPromptForLlm: nodeData.taskPromptForLlm || '',
            cliCommand: nodeData.cliCommand || ''
        });

        parentElement.appendChild(nodeElement);

        // Handle children
        if (nodeData.children && nodeData.children.length > 0) {
            const childContainer = nodeElement.querySelector('.node-parent');
            if (childContainer) {
                nodeData.children.forEach(childNode => {
                    this.renderJSONNode(childNode, childContainer);
                });
            }
        }
    }

    renderXMLNode(nodeData, parentElement) {
        const priority = nodeData.$ && nodeData.$.priority || 'medium';
        const status = nodeData.$ && nodeData.$.status || 'pending';
        let nodeId = nodeData.$ && nodeData.$.id;
        
        // Fix undefined or missing IDs
        if (!nodeId || nodeId === 'undefined') {
            nodeId = NodeManager.generateId();
            if (nodeData.$) {
                nodeData.$.id = nodeId;
            }
            console.warn('Fixed undefined node ID in renderNode, generated:', nodeId);
        }
        
        const title = nodeData.$ && nodeData.$.title || 'New Node';
        const startDate = nodeData.$ && nodeData.$.startDate || '';
        const endDate = nodeData.$ && nodeData.$.endDate || '';
        const daysSpent = nodeData.$ && nodeData.$.daysSpent || '0';
        
        const nodeElement = this.createNodeElement({
            id: nodeId,
            title: title,
            priority: priority,
            status: status,
            comment: nodeData.comment && nodeData.comment._ || '',
            startDate: startDate,
            endDate: endDate,
            daysSpent: parseInt(daysSpent) || 0,
            code: nodeData.code || null,
            taskPromptForLlm: nodeData.taskPromptForLlm && nodeData.taskPromptForLlm._ || '',
            cliCommand: nodeData.cliCommand && nodeData.cliCommand._ || '',
            dataSource: nodeData.$ && nodeData.$.dataSource,
            dataImported: nodeData.$ && nodeData.$.dataImported,
            dataImportFrom: nodeData.$ && nodeData.$.dataImportFrom
        });

        parentElement.appendChild(nodeElement);

        // Handle children
        if (nodeData.node) {
            const childNodes = Array.isArray(nodeData.node) ? nodeData.node : [nodeData.node];
            const childContainer = nodeElement.querySelector('.node-parent');
            if (childContainer) {
                childNodes.forEach(childNode => {
                    this.renderXMLNode(childNode, childContainer);
                });
            }
        }
    }

    createNodeElement(nodeProps) {
        const {
            id, title, priority, status, comment, startDate, endDate, daysSpent,
            code, taskPromptForLlm, cliCommand, dataSource, dataImported, dataImportFrom
        } = nodeProps;

        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'node';
        nodeDiv.dataset.priority = priority;
        nodeDiv.dataset.status = status;
        nodeDiv.dataset.id = id;
        
        // Set data attributes for save-split functionality
        if (dataSource) nodeDiv.dataset.dataSource = dataSource;
        if (dataImported) nodeDiv.dataset.dataImported = dataImported;
        if (dataImportFrom) nodeDiv.dataset.dataImportFrom = dataImportFrom;
        
        nodeDiv.classList.add(`priority-${priority}`);
        nodeDiv.classList.add(`status-${status}`);
        
        const nodeWrapper = document.createElement('div');
        nodeWrapper.className = 'node-wrapper';
        nodeWrapper.dataset.id = id;
        
        const nodeContentDiv = document.createElement('div');
        nodeContentDiv.className = 'node-content';
        
        // Create status icon
        // Toggle button for expanding/collapsing children
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'node-toggle';
        toggleIcon.textContent = '–';
        
        // Add toggle functionality
        toggleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const childrenContainer = nodeDiv.querySelector('.node-parent');
            if (childrenContainer) {
                if (!childrenContainer.classList.contains('collapsed')) {
                    const descendantParents = childrenContainer.querySelectorAll('.node-parent');
                    descendantParents.forEach(parent => parent.classList.add('collapsed'));
                    
                    const descendantToggles = childrenContainer.querySelectorAll('.node-toggle');
                    descendantToggles.forEach(toggle => toggle.textContent = '➕');
                }
                childrenContainer.classList.toggle('collapsed');
                toggleIcon.textContent = childrenContainer.classList.contains('collapsed') ? '➕' : '–';
            }
        });
        
        const statusIcon = document.createElement('span');
        statusIcon.className = 'node-icon icon-status status-icon';
        statusIcon.textContent = NodeManager.getStatusIcon(status);
        statusIcon.title = "Cycle Status";
        statusIcon.onclick = () => NodeManager.cycleStatus(nodeDiv);
        
        // Create title
        const titleSpan = document.createElement('span');
        titleSpan.className = 'node-title';
        titleSpan.textContent = title;
        titleSpan.contentEditable = true;
        titleSpan.onblur = () => {
            if (window.autoSave) window.autoSave();
        };
        
        // Import indicator
        if (dataImported === 'true') {
            const indicator = document.createElement('span');
            indicator.className = 'import-indicator';
            indicator.textContent = '🔗 ' + dataImportFrom;
            indicator.title = 'Imported from: ' + dataImportFrom;
            titleSpan.appendChild(indicator);
        }
        
        // Create control icons
        const dateIcon = document.createElement('span');
        dateIcon.className = 'node-icon icon-date';
        dateIcon.innerHTML = '📅';
        dateIcon.title = 'Toggle Dates';
        dateIcon.onclick = () => this.toggleDates(nodeWrapper);
        
        const commentIcon = document.createElement('span');
        commentIcon.className = 'node-icon icon-comment';
        commentIcon.innerHTML = '💬';
        commentIcon.title = 'Toggle Comment';
        commentIcon.onclick = () => NodeManager.toggleComment(nodeWrapper);
        
        const addIcon = document.createElement('span');
        addIcon.className = 'node-icon icon-add';
        addIcon.innerHTML = '➕';
        addIcon.title = 'Add Child Node';
        addIcon.onclick = () => NodeManager.addChildNode(nodeDiv);
        
        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'node-icon icon-delete';
        deleteIcon.innerHTML = '🗑️';
        deleteIcon.title = 'Delete Node';
        deleteIcon.onclick = () => NodeManager.deleteNode(nodeDiv);
        
        // Assemble node content
        nodeContentDiv.appendChild(toggleIcon);
        nodeContentDiv.appendChild(statusIcon);
        nodeContentDiv.appendChild(titleSpan);
        nodeContentDiv.appendChild(dateIcon);
        nodeContentDiv.appendChild(commentIcon);
        nodeContentDiv.appendChild(addIcon);
        nodeContentDiv.appendChild(deleteIcon);
        
        nodeWrapper.appendChild(nodeContentDiv);
        
        // Create comment section
        const commentDiv = document.createElement('div');
        commentDiv.className = 'node-comment';
        commentDiv.contentEditable = true;
        commentDiv.placeholder = 'Add a comment...';
        commentDiv.style.display = 'none';
        commentDiv.onblur = () => {
            if (window.autoSave) window.autoSave();
        };
        
        if (comment) {
            commentDiv.textContent = comment;
            commentDiv.style.display = window.areCommentsVisible !== false ? 'block' : 'none';
            nodeWrapper.classList.add('has-comment');
        }
        
        nodeWrapper.appendChild(commentDiv);
        
        // Create dates section
        if (startDate || endDate || daysSpent > 0) {
            const datesDiv = this.createDatesSection(startDate, endDate, daysSpent, nodeDiv);
            nodeWrapper.appendChild(datesDiv);
        }
        
        // Add advanced elements
        if (code) {
            const codeElement = this.createCodeElement(code, nodeWrapper);
            nodeWrapper.appendChild(codeElement);
        }
        
        if (taskPromptForLlm) {
            const taskElement = this.createTaskPromptElement(taskPromptForLlm, nodeWrapper);
            nodeWrapper.appendChild(taskElement);
        }
        
        if (cliCommand) {
            const cliElement = this.createCliCommandElement(cliCommand, nodeWrapper);
            nodeWrapper.appendChild(cliElement);
        }
        
        // Create parent container for children
        const nodeParent = document.createElement('div');
        nodeParent.className = 'node-parent';
        nodeWrapper.appendChild(nodeParent);
        
        nodeDiv.appendChild(nodeWrapper);
        
        // Add context menu
        nodeDiv.oncontextmenu = (e) => {
            e.preventDefault();
            NodeManager.showContextMenu(e, nodeDiv);
        };
        
        return nodeDiv;
    }

    createDatesSection(startDate, endDate, daysSpent, nodeDiv) {
        const datesDiv = document.createElement('div');
        datesDiv.className = 'node-dates';
        datesDiv.style.display = window.areDatesVisible ? 'block' : 'none';
        
        datesDiv.innerHTML = `
            <div class="date-row">
                <label>Start:</label>
                <span class="date-value" data-type="startDate" contenteditable="true">${startDate}</span>
                <label>End:</label>
                <span class="date-value" data-type="endDate" contenteditable="true">${endDate}</span>
                <label>Days:</label>
                <button class="days-btn" onclick="changeDays(this.parentNode.parentNode.parentNode.parentNode, -1)">-</button>
                <span class="days-spent-value">${daysSpent}</span>
                <button class="days-btn" onclick="changeDays(this.parentNode.parentNode.parentNode.parentNode, 1)">+</button>
            </div>
        `;
        
        return datesDiv;
    }

    createCodeElement(codeData, nodeWrapper) {
        // Implementation would go here - this is a placeholder
        const codeDiv = document.createElement('div');
        codeDiv.className = 'node-code';
        codeDiv.innerHTML = `<pre><code class="language-${codeData.language || 'javascript'}">${codeData.content || ''}</code></pre>`;
        return codeDiv;
    }

    createTaskPromptElement(taskText, nodeWrapper) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'node-task-prompt';
        taskDiv.innerHTML = `<div class="task-prompt-content" contenteditable="true">${taskText}</div>`;
        return taskDiv;
    }

    createCliCommandElement(cliText, nodeWrapper) {
        const cliDiv = document.createElement('div');
        cliDiv.className = 'node-cli-command';
        cliDiv.innerHTML = `<div class="cli-command-content" contenteditable="true">${cliText}</div>`;
        return cliDiv;
    }

    toggleDates(wrapper) {
        const dates = wrapper.querySelector('.node-dates');
        if (dates) {
            const isVisible = dates.style.display !== 'none';
            dates.style.display = isVisible ? 'none' : 'block';
        }
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    showEmptyState(message = 'No data to display') {
        if (this.container) {
            this.container.innerHTML = `<div class="empty-state">${message}</div>`;
        }
    }

    showErrorState(error) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="error-state">
                    <h2>❌ Error</h2>
                    <p>${error.message || error}</p>
                </div>
            `;
        }
    }
}

// Create and export singleton instance
export const uiRenderer = new UIRenderer();

// Export for backward compatibility
window.uiRenderer = uiRenderer;
window.renderMindMap = () => uiRenderer.renderMindMap();
window.renderNode = (nodeData, parentElement) => {
    // This is a simplified compatibility function
    console.warn('Deprecated: Use uiRenderer.renderXMLNode or uiRenderer.renderJSONNode instead');
};

// Assign to window for global access
window.UIRenderer = UIRenderer;