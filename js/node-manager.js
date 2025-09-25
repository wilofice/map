/**
 * Node management functionality for CRUD operations on mind map nodes
 */

import { updateProgressBar } from './progress-tracker.js';

export class NodeManager {
    static generateId() {
        return crypto.randomUUID();
    }

    static getStatusIcon(status) {
        switch(status) {
            case 'completed': return '✅';
            case 'in-progress': return '🟡';
            default: return '🔲';
        }
    }

    static cycleStatus(node) {
        const statuses = ['pending', 'in-progress', 'completed'];
        const currentStatus = node.dataset.status;
        const currentIndex = statuses.indexOf(currentStatus);
        const newStatus = statuses[(currentIndex + 1) % 3];
        
        node.dataset.status = newStatus;
        node.querySelector('.status-icon').textContent = NodeManager.getStatusIcon(newStatus);
        
        // Update progress bar when status changes
        updateProgressBar();
        
        // Auto-save (will be available from global scope)
        if (typeof window.autoSave === 'function') {
            window.autoSave();
        }
    }

    static addChildNode(parentNode) {
        let parent = parentNode.querySelector('.node-parent');
        
        // If no parent container exists, create one
        if (!parent) {
            parent = document.createElement('div');
            parent.className = 'node-parent';
            parentNode.appendChild(parent);
            
            // Add toggle button to parent content
            const content = parentNode.querySelector('.node-content');
            if (!content.querySelector('.node-toggle')) {
                const toggle = document.createElement('span');
                toggle.className = 'node-toggle';
                toggle.textContent = '–';
                toggle.onclick = () => NodeManager.toggleNode(parentNode, toggle);
                content.insertBefore(toggle, content.firstChild);
            }
        }
        
        const newNode = {
            $: {
                title: 'New Node',
                priority: 'medium',
                status: 'pending',
                id: NodeManager.generateId()
            }
        };
        
        // Inherit data attributes from parent for save-split functionality
        if (parentNode.dataset.dataSource) {
            newNode.$.dataSource = parentNode.dataset.dataSource;
        } else {
            // If parent has no dataSource, use current file as source
            newNode.$.dataSource = window.currentFile || 'unknown';
        }
        
        // Use renderNode from global scope (will be available from ui-components)
        const newEl = window.renderNode ? window.renderNode(newNode, true) : null;
        if (newEl) {
            parent.appendChild(newEl);
            
            // Focus on the new node's title
            const title = newEl.querySelector('.node-title');
            if (title) {
                title.focus();
                title.select();
            }
            
            // Update progress bar after adding node
            updateProgressBar();
            
            // Auto-save
            if (typeof window.autoSave === 'function') {
                window.autoSave();
            }
        }
    }

    static deleteNode(node) {
        if (confirm('Delete this node and all its children?')) {
            node.remove();
            // Update progress bar after deleting node
            updateProgressBar();
            
            // Auto-save
            if (typeof window.autoSave === 'function') {
                window.autoSave();
            }
        }
    }

    static toggleNode(node, toggle) {
        const parent = node.querySelector('.node-parent');
        if (parent) {
            parent.classList.toggle('collapsed');
            toggle.textContent = parent.classList.contains('collapsed') ? '➕' : '–';
        }
    }

    static toggleComment(wrapper) {
        const comment = wrapper.querySelector('.node-comment');
        const hasComment = wrapper.classList.contains('has-comment');
        
        if (hasComment) {
            wrapper.classList.remove('has-comment');
            comment.style.display = 'none';
            comment.textContent = '';
        } else {
            wrapper.classList.add('has-comment');
            // Check global visibility setting
            const areCommentsVisible = window.areCommentsVisible !== false;
            comment.style.display = areCommentsVisible ? 'block' : 'none';
            comment.focus();
        }
        
        // Auto-save
        if (typeof window.autoSave === 'function') {
            window.autoSave();
        }
    }

    static showContextMenu(e, node) {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.left = e.pageX + 'px';
            menu.style.top = e.pageY + 'px';
            menu.classList.add('visible');
            
            menu.querySelectorAll('.context-menu-item').forEach(item => {
                item.onclick = () => {
                    node.dataset.priority = item.dataset.priority;
                    menu.classList.remove('visible');
                    
                    // Auto-save
                    if (typeof window.autoSave === 'function') {
                        window.autoSave();
                    }
                };
            });
        }
    }
}

// Export functions for backward compatibility with existing code
export function generateId() {
    return NodeManager.generateId();
}

export function getStatusIcon(status) {
    return NodeManager.getStatusIcon(status);
}

export function cycleStatus(node) {
    return NodeManager.cycleStatus(node);
}

export function addChildNode(parentNode) {
    return NodeManager.addChildNode(parentNode);
}

export function deleteNode(node) {
    return NodeManager.deleteNode(node);
}

export function toggleNode(node, toggle) {
    return NodeManager.toggleNode(node, toggle);
}

export function toggleComment(wrapper) {
    return NodeManager.toggleComment(wrapper);
}

export function showContextMenu(e, node) {
    return NodeManager.showContextMenu(e, node);
}

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    Object.assign(window, {
        generateId,
        getStatusIcon,
        cycleStatus,
        addChildNode,
        deleteNode,
        toggleNode,
        toggleComment,
        showContextMenu,
        NodeManager
    });
}