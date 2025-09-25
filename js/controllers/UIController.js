/**
 * UI Controller for Mind Map application
 * Handles UI state management and global toggle functions
 */

export class UIController {
    constructor() {
        this.state = {
            areCommentsVisible: false,
            areDatesVisible: false,
            areAddButtonsVisible: true,
            areFlashesVisible: true,
            areLinesAnimated: true
        };
        this.initialized = false;
    }

    initialize() {
        this.setupGlobalState();
        this.initialized = true;
        return true;
    }

    setupGlobalState() {
        // Make state globally available for backward compatibility
        if (typeof window !== 'undefined') {
            window.areCommentsVisible = this.state.areCommentsVisible;
            window.areDatesVisible = this.state.areDatesVisible;
            window.areAddButtonsVisible = this.state.areAddButtonsVisible;
            window.areFlashesVisible = this.state.areFlashesVisible;
            window.areLinesAnimated = this.state.areLinesAnimated;
        }
    }

    // Comment visibility management
    toggleAllComments() {
        this.state.areCommentsVisible = !this.state.areCommentsVisible;
        
        document.querySelectorAll('.node-comment').forEach(comment => {
            const wrapper = comment.closest('.node-wrapper');
            if (wrapper && wrapper.classList.contains('has-comment')) {
                comment.style.display = this.state.areCommentsVisible ? 'block' : 'none';
            }
        });
        
        this.updateToggleCommentsButton();
        this.updateGlobalState();
    }

    showAllComments() {
        this.state.areCommentsVisible = true;
        document.querySelectorAll('.node-comment').forEach(comment => {
            const wrapper = comment.closest('.node-wrapper');
            if (wrapper && wrapper.classList.contains('has-comment')) {
                comment.style.display = 'block';
            }
        });
        this.updateToggleCommentsButton();
        this.updateGlobalState();
    }

    hideAllComments() {
        this.state.areCommentsVisible = false;
        document.querySelectorAll('.node-comment').forEach(comment => {
            comment.style.display = 'none';
        });
        this.updateToggleCommentsButton();
        this.updateGlobalState();
    }

    // Date visibility management
    toggleAllDates() {
        this.state.areDatesVisible = !this.state.areDatesVisible;
        
        document.querySelectorAll('.node-dates').forEach(dates => {
            dates.style.display = this.state.areDatesVisible ? 'flex' : 'none';
        });
        
        this.updateToggleDatesButton();
        this.updateGlobalState();
    }

    showAllDates() {
        this.state.areDatesVisible = true;
        document.querySelectorAll('.node-dates').forEach(dates => {
            dates.style.display = 'flex';
        });
        this.updateToggleDatesButton();
        this.updateGlobalState();
    }

    hideAllDates() {
        this.state.areDatesVisible = false;
        document.querySelectorAll('.node-dates').forEach(dates => {
            dates.style.display = 'none';
        });
        this.updateToggleDatesButton();
        this.updateGlobalState();
    }

    // Add button visibility management
    toggleAllAddButtons() {
        this.state.areAddButtonsVisible = !this.state.areAddButtonsVisible;
        
        if (this.state.areAddButtonsVisible) {
            document.body.classList.remove('add-hidden');
        } else {
            document.body.classList.add('add-hidden');
        }
        
        this.updateToggleAddButton();
        this.updateGlobalState();
    }

    showAllAddButtons() {
        this.state.areAddButtonsVisible = true;
        document.body.classList.remove('add-hidden');
        this.updateToggleAddButton();
        this.updateGlobalState();
    }

    hideAllAddButtons() {
        this.state.areAddButtonsVisible = false;
        document.body.classList.add('add-hidden');
        this.updateToggleAddButton();
        this.updateGlobalState();
    }

    // Node collapse/expand management
    toggleAllNodes() {
        const rootNode = document.querySelector('#mindMapContainer > .node');
        if (!rootNode) return;
        
        const rootParent = rootNode.querySelector('.node-parent');
        if (!rootParent) return;
        
        const isCollapsed = rootParent.classList.contains('collapsed');
        
        document.querySelectorAll('.node-parent').forEach(parent => {
            if (isCollapsed) {
                parent.classList.remove('collapsed');
            } else {
                parent.classList.add('collapsed');
            }
        });
        
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            toggle.textContent = isCollapsed ? '–' : '➕';
        });
        
        this.updateToggleAllButton();
    }

    expandAllNodes() {
        document.querySelectorAll('.node-parent').forEach(parent => {
            parent.classList.remove('collapsed');
        });
        
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            toggle.textContent = '–';
        });
        
        this.updateToggleAllButton();
    }

    collapseAllNodes() {
        document.querySelectorAll('.node-parent').forEach(parent => {
            parent.classList.add('collapsed');
        });
        
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            toggle.textContent = '➕';
        });
        
        this.updateToggleAllButton();
    }

    // Flash animation management
    toggleFlash() {
        this.state.areFlashesVisible = !this.state.areFlashesVisible;
        
        if (this.state.areFlashesVisible) {
            document.body.classList.remove('no-flash');
        } else {
            document.body.classList.add('no-flash');
        }
        
        this.updateToggleFlashButton();
        this.updateGlobalState();
    }

    enableFlash() {
        this.state.areFlashesVisible = true;
        document.body.classList.remove('no-flash');
        this.updateToggleFlashButton();
        this.updateGlobalState();
    }

    disableFlash() {
        this.state.areFlashesVisible = false;
        document.body.classList.add('no-flash');
        this.updateToggleFlashButton();
        this.updateGlobalState();
    }

    // Line animation management
    toggleAnimateLines() {
        this.state.areLinesAnimated = !this.state.areLinesAnimated;
        
        if (this.state.areLinesAnimated) {
            document.body.classList.remove('no-animate');
        } else {
            document.body.classList.add('no-animate');
        }
        
        this.updateToggleAnimateLinesButton();
        this.updateGlobalState();
    }

    enableLineAnimations() {
        this.state.areLinesAnimated = true;
        document.body.classList.remove('no-animate');
        this.updateToggleAnimateLinesButton();
        this.updateGlobalState();
    }

    disableLineAnimations() {
        this.state.areLinesAnimated = false;
        document.body.classList.add('no-animate');
        this.updateToggleAnimateLinesButton();
        this.updateGlobalState();
    }

    // Button update methods
    updateToggleCommentsButton() {
        const btn = document.getElementById('toggleComments');
        if (btn) {
            btn.classList.toggle('active', this.state.areCommentsVisible);
            btn.title = this.state.areCommentsVisible ? 'Hide Comments' : 'Show Comments';
        }
    }

    updateToggleDatesButton() {
        const btn = document.getElementById('toggleDates');
        if (btn) {
            btn.classList.toggle('active', this.state.areDatesVisible);
            btn.title = this.state.areDatesVisible ? 'Hide Dates' : 'Show Dates';
        }
    }

    updateToggleAddButton() {
        const btn = document.getElementById('toggleAddButtons');
        if (btn) {
            btn.classList.toggle('active', this.state.areAddButtonsVisible);
            btn.title = this.state.areAddButtonsVisible ? 'Hide Add Buttons' : 'Show Add Buttons';
        }
    }

    updateToggleAllButton() {
        const btn = document.getElementById('toggleAll');
        if (btn) {
            const hasCollapsed = document.querySelector('.node-parent.collapsed');
            btn.title = hasCollapsed ? 'Expand All' : 'Collapse All';
        }
    }

    updateToggleFlashButton() {
        const btn = document.getElementById('toggleFlash');
        if (btn) {
            btn.classList.toggle('active', this.state.areFlashesVisible);
            btn.title = this.state.areFlashesVisible ? 'Disable Flash' : 'Enable Flash';
        }
    }

    updateToggleAnimateLinesButton() {
        const btn = document.getElementById('toggleAnimateLines');
        if (btn) {
            btn.classList.toggle('active', this.state.areLinesAnimated);
            btn.title = this.state.areLinesAnimated ? 'Disable Animations' : 'Enable Animations';
        }
    }

    // Update global window state for backward compatibility
    updateGlobalState() {
        if (typeof window !== 'undefined') {
            window.areCommentsVisible = this.state.areCommentsVisible;
            window.areDatesVisible = this.state.areDatesVisible;
            window.areAddButtonsVisible = this.state.areAddButtonsVisible;
            window.areFlashesVisible = this.state.areFlashesVisible;
            window.areLinesAnimated = this.state.areLinesAnimated;
        }
    }

    // State getters
    getState() {
        return { ...this.state };
    }

    isCommentsVisible() {
        return this.state.areCommentsVisible;
    }

    isDatesVisible() {
        return this.state.areDatesVisible;
    }

    isAddButtonsVisible() {
        return this.state.areAddButtonsVisible;
    }

    isFlashEnabled() {
        return this.state.areFlashesVisible;
    }

    isAnimationsEnabled() {
        return this.state.areLinesAnimated;
    }

    // Reset all UI state
    resetUIState() {
        this.state = {
            areCommentsVisible: false,
            areDatesVisible: false,
            areAddButtonsVisible: true,
            areFlashesVisible: true,
            areLinesAnimated: true
        };
        
        this.hideAllComments();
        this.hideAllDates();
        this.showAllAddButtons();
        this.enableFlash();
        this.enableLineAnimations();
        this.expandAllNodes();
    }

    // Apply UI state to DOM
    applyUIState() {
        if (this.state.areCommentsVisible) {
            this.showAllComments();
        } else {
            this.hideAllComments();
        }
        
        if (this.state.areDatesVisible) {
            this.showAllDates();
        } else {
            this.hideAllDates();
        }
        
        if (this.state.areAddButtonsVisible) {
            this.showAllAddButtons();
        } else {
            this.hideAllAddButtons();
        }
        
        if (this.state.areFlashesVisible) {
            this.enableFlash();
        } else {
            this.disableFlash();
        }
        
        if (this.state.areLinesAnimated) {
            this.enableLineAnimations();
        } else {
            this.disableLineAnimations();
        }
    }
}

// Create and export singleton instance
export const uiController = new UIController();

// Export for backward compatibility
window.uiController = uiController;
window.toggleAllComments = () => uiController.toggleAllComments();
window.toggleAllDates = () => uiController.toggleAllDates();
window.toggleAllAddButtons = () => uiController.toggleAllAddButtons();
window.toggleAllNodes = () => uiController.toggleAllNodes();
window.toggleFlash = () => uiController.toggleFlash();
window.toggleAnimateLines = () => uiController.toggleAnimateLines();

export default UIController;