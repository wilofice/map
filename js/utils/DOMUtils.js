/**
 * DOM Utilities for Mind Map application
 * Helper functions for DOM manipulation and data processing
 */

export class DOMUtils {
    /**
     * Generate a unique ID using crypto.randomUUID or fallback
     * @returns {string} Unique identifier
     */
    static generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        // Fallback for older browsers
        return 'id-' + Math.random().toString(36).substr(2, 16) + '-' + Date.now().toString(36);
    }

    /**
     * Escape XML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeXML(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Set node status recursively for all children
     * @param {HTMLElement} node - Parent node
     * @param {string} newStatus - New status to apply
     */
    static setNodeStatusRecursive(node, newStatus) {
        // Set status for current node
        node.dataset.status = newStatus;
        
        // Update status icon
        const statusIcon = node.querySelector('.status-icon');
        if (statusIcon) {
            statusIcon.textContent = this.getStatusIcon(newStatus);
        }
        
        // Update node classes
        node.className = node.className.replace(/status-\w+/g, '');
        node.classList.add(`status-${newStatus}`);
        
        // Recursively update children
        const childNodes = node.querySelectorAll('.node-parent > .node');
        childNodes.forEach(childNode => {
            this.setNodeStatusRecursive(childNode, newStatus);
        });
        
        // Trigger auto-save
        if (typeof window.autoSave === 'function') {
            window.autoSave();
        }
    }

    /**
     * Get status icon for given status
     * @param {string} status - Node status
     * @returns {string} Status icon
     */
    static getStatusIcon(status) {
        switch (status) {
            case 'completed': return '✅';
            case 'in-progress': return '🟡';
            default: return '🔲';
        }
    }

    /**
     * Change days spent on a node
     * @param {HTMLElement} node - Node element
     * @param {number} delta - Change amount (+1 or -1)
     */
    static changeDays(node, delta) {
        const daysSpentElement = node.querySelector('.days-spent-value');
        if (!daysSpentElement) return;
        
        let currentDays = parseInt(daysSpentElement.textContent) || 0;
        currentDays = Math.max(0, currentDays + delta); // Don't go below 0
        
        daysSpentElement.textContent = currentDays;
        
        // Trigger auto-save
        if (typeof window.autoSave === 'function') {
            window.autoSave();
        }
    }

    /**
     * Find node element by ID
     * @param {string} nodeId - Node ID to find
     * @returns {HTMLElement|null} Node element or null if not found
     */
    static findNodeById(nodeId) {
        return document.querySelector(`[data-id="${nodeId}"]`);
    }

    /**
     * Get all nodes with specific status
     * @param {string} status - Status to filter by
     * @returns {NodeList} Nodes with matching status
     */
    static getNodesByStatus(status) {
        return document.querySelectorAll(`[data-status="${status}"]`);
    }

    /**
     * Get all nodes with specific priority
     * @param {string} priority - Priority to filter by
     * @returns {NodeList} Nodes with matching priority
     */
    static getNodesByPriority(priority) {
        return document.querySelectorAll(`[data-priority="${priority}"]`);
    }

    /**
     * Copy text to clipboard with user feedback
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button to show feedback on
     */
    static async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            const originalColor = button.style.backgroundColor;
            
            button.textContent = 'Copied!';
            button.style.backgroundColor = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = originalColor;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => button.textContent = originalText, 2000);
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                const originalText = button.textContent;
                button.textContent = 'Copy failed';
                setTimeout(() => button.textContent = originalText, 2000);
            }
            
            document.body.removeChild(textArea);
        }
    }

    /**
     * Clean up undefined or duplicate node IDs
     * @returns {Promise<number>} Number of IDs fixed
     */
    static async cleanupIds() {
        const nodes = document.querySelectorAll('.node');
        let fixedCount = 0;
        const usedIds = new Set();
        
        nodes.forEach(node => {
            let nodeId = node.dataset.id;
            
            // Fix undefined or empty IDs
            if (!nodeId || nodeId === 'undefined' || nodeId === '') {
                nodeId = this.generateId();
                node.dataset.id = nodeId;
                
                // Also update the wrapper if it exists
                const wrapper = node.querySelector('.node-wrapper');
                if (wrapper) {
                    wrapper.dataset.id = nodeId;
                }
                
                fixedCount++;
                console.log('Fixed undefined ID, generated:', nodeId);
            }
            // Fix duplicate IDs
            else if (usedIds.has(nodeId)) {
                const newId = this.generateId();
                node.dataset.id = newId;
                
                const wrapper = node.querySelector('.node-wrapper');
                if (wrapper) {
                    wrapper.dataset.id = newId;
                }
                
                fixedCount++;
                console.log('Fixed duplicate ID:', nodeId, '-> new:', newId);
                usedIds.add(newId);
            } else {
                usedIds.add(nodeId);
            }
        });
        
        if (fixedCount > 0) {
            console.log(`Cleaned up ${fixedCount} node IDs`);
            
            // Trigger auto-save if available
            if (typeof window.autoSave === 'function') {
                window.autoSave();
            }
        }
        
        return fixedCount;
    }

    /**
     * Create a debounced version of a function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Create a throttled version of a function
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * Get element position relative to page
     * @param {HTMLElement} element - Element to get position for
     * @returns {Object} Position object with x and y coordinates
     */
    static getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + window.pageXOffset,
            y: rect.top + window.pageYOffset,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is visible
     */
    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Scroll element into view smoothly
     * @param {HTMLElement} element - Element to scroll to
     * @param {Object} options - Scroll options
     */
    static scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }
}

// Export static methods for backward compatibility
export const generateId = () => DOMUtils.generateId();
export const escapeXML = (text) => DOMUtils.escapeXML(text);
export const copyToClipboard = (text, button) => DOMUtils.copyToClipboard(text, button);
export const setNodeStatusRecursive = (node, status) => DOMUtils.setNodeStatusRecursive(node, status);
export const changeDays = (node, delta) => DOMUtils.changeDays(node, delta);
export const cleanupIds = () => DOMUtils.cleanupIds();

// Make utilities globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.DOMUtils = DOMUtils;
    window.generateId = generateId;
    window.escapeXML = escapeXML;
    window.copyToClipboard = copyToClipboard;
    window.setNodeStatusRecursive = setNodeStatusRecursive;
    window.changeDays = changeDays;
    window.cleanupIds = cleanupIds;
}

// Assign to window for global access
window.DOMUtils = DOMUtils;