/**
 * AppController - Main application controller
 * Coordinates all other controllers and manages application lifecycle
 */
class AppController {
    constructor() {
        this.isInitialized = false;
        this.currentProject = null;
        this.currentCollection = null;
        this.bindEvents();
        this.init();
    }

    /**
     * Inject dependencies - enables clean dependency management
     */
    injectDependencies(dependencies) {
        Object.assign(this, dependencies);
        return this;
    }

    /**
     * Initialize the complete MVC application
     */
    async init() {
        try {
            console.log('🚀 Initializing Mind Map MVC App (Phase 4)...');
            console.log('📋 Version:', this.version);
            
            // Initialize API client
            await this.apiClient.initialize();
            console.log('✅ API client initialized');
            
            // Initialize all view components
            this.uiRenderer.initialize('mindMapContainer');
            this.boardView.initialize('boardContainer');
            this.sidebarView.initialize('sidebar');
            console.log('✅ View components initialized');
            
            // Initialize UI controller
            this.uiController.initialize();
            console.log('✅ UI controller initialized');
            
            // Load working root and files
            await this.sidebarView.loadWorkingRoot();
            await this.sidebarView.loadFileList();
            console.log('✅ File system loaded');
            
            // Setup comprehensive event listeners
            this.setupEventListeners();
            console.log('✅ Event system configured');
            
            this.initialized = true;
            console.log('🎉 Mind Map MVC App (Phase 4) initialized successfully!');
            console.log('🎯 Features: Complete Controller Separation, Professional MVC Architecture');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
        }
    }

    /**
     * Setup all application event listeners
     */
    setupEventListeners() {
        this.setupFileOperationEvents();
        this.setupUIControlEvents();
        this.setupUtilityEvents();
        this.setupFileSelectionEvents();
        this.setupKeyboardShortcuts();
    }

    /**
     * Setup file operation event listeners
     */
    setupFileOperationEvents() {
        // Save button
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            this.syncModel.manualSave();
        });
        
        // New file button
        document.getElementById('newFileBtn')?.addEventListener('click', () => {
            this.createNewFile();
        });
        
        // View switching button
        document.getElementById('toggleBoardView')?.addEventListener('click', () => {
            this.toggleView();
        });
    }

    /**
     * Setup UI control event listeners
     */
    setupUIControlEvents() {
        // Comments toggle
        document.getElementById('toggleComments')?.addEventListener('click', () => {
            this.uiController.toggleAllComments();
        });
        
        // Dates toggle
        document.getElementById('toggleDates')?.addEventListener('click', () => {
            this.uiController.toggleAllDates();
        });
        
        // Add buttons toggle
        document.getElementById('toggleAddButtons')?.addEventListener('click', () => {
            this.uiController.toggleAllAddButtons();
        });
        
        // All nodes toggle
        document.getElementById('toggleAll')?.addEventListener('click', () => {
            this.uiController.toggleAllNodes();
        });
        
        // Flash animations toggle
        document.getElementById('toggleFlash')?.addEventListener('click', () => {
            this.uiController.toggleFlash();
        });
        
        // Line animations toggle
        document.getElementById('toggleAnimateLines')?.addEventListener('click', () => {
            this.uiController.toggleAnimateLines();
        });
    }

    /**
     * Setup utility event listeners
     */
    setupUtilityEvents() {
        // ID cleanup button
        document.getElementById('cleanupBtn')?.addEventListener('click', async () => {
            const fixed = await this.DOMUtils.cleanupIds();
            if (fixed > 0) {
                this.showNotification(`Cleaned up ${fixed} node IDs`, 'success');
            } else {
                this.showNotification('No ID cleanup needed', 'info');
            }
        });
    }

    /**
     * Setup file selection event handlers
     */
    setupFileSelectionEvents() {
        this.sidebarView.setFileSelectHandler(async (filename, type) => {
            await this.loadFile(filename);
        });
    }

    /**
     * Setup global keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.syncModel.manualSave();
                        this.showNotification('File saved', 'success');
                        break;
                    case 'b':
                        e.preventDefault();
                        this.toggleView();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.createNewFile();
                        break;
                }
            }
        });
    }

    /**
     * Load and display a file
     */
    async loadFile(filename) {
        try {
            console.log(`Loading file: ${filename}`);
            const fileData = await this.fileModel.loadFile(filename);
            
            // Render based on current view
            if (this.currentView === 'board') {
                this.boardView.populateBoard();
            } else {
                this.uiRenderer.renderMindMap();
            }
            
            // Apply syntax highlighting for any code blocks
            this.advancedComponents.initializePrismHighlighting();
            
            // Start sync monitoring
            this.syncModel.startSyncCheck();
            
            console.log(`✅ File loaded and rendered: ${filename}`);
            this.showNotification(`File loaded: ${filename}`, 'success');
            
        } catch (error) {
            console.error('Error loading file:', error);
            this.uiRenderer.showErrorState(error);
            this.showNotification(`Error loading file: ${error.message}`, 'error');
        }
    }

    /**
     * Toggle between mind map and board views
     */
    toggleView() {
        const mindMap = document.getElementById('mindMapContainer');
        const board = document.getElementById('boardContainer');
        const btn = document.getElementById('toggleBoardView');
        
        if (this.currentView === 'mindmap') {
            // Switch to board view
            mindMap.style.display = 'none';
            board.style.display = 'block';
            btn.textContent = '🧠 Mind Map';
            this.currentView = 'board';
            
            // Refresh board if data is loaded
            if (this.dataModel.getCurrentFile()) {
                this.boardView.populateBoard();
            }
            
            console.log('Switched to board view');
        } else {
            // Switch to mind map view
            mindMap.style.display = 'block';
            board.style.display = 'none';
            btn.textContent = '📋 Board View';
            this.currentView = 'mindmap';
            
            // Refresh mind map if data is loaded
            if (this.dataModel.getCurrentFile()) {
                this.uiRenderer.renderMindMap();
                this.advancedComponents.initializePrismHighlighting();
            }
            
            console.log('Switched to mind map view');
        }
    }

    /**
     * Create a new file with user input
     */
    async createNewFile() {
        const filename = prompt('Enter filename (with .json extension):');
        if (filename && filename.trim()) {
            try {
                const result = await this.fileModel.createFile(filename.trim());
                if (result.success) {
                    await this.sidebarView.refreshFileList();
                    await this.loadFile(filename.trim());
                    console.log(`✅ New file created: ${filename}`);
                    this.showNotification(`New file created: ${filename}`, 'success');
                }
            } catch (error) {
                console.error('Failed to create file:', error);
                this.showNotification(`Failed to create file: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Show user notification
     */
    showNotification(message, type = 'info') {
        // Simple notification system - could be enhanced with toast notifications
        const duration = type === 'error' ? 5000 : 3000;
        
        // For now, use alert for errors and console for others
        if (type === 'error') {
            alert(message);
        } else {
            console.log(`📢 ${message}`);
            
            // Flash the save indicator for success messages
            if (type === 'success') {
                const saveIndicator = document.getElementById('saveIndicator');
                if (saveIndicator) {
                    const originalText = saveIndicator.textContent;
                    const originalColor = saveIndicator.style.backgroundColor;
                    
                    saveIndicator.textContent = message;
                    saveIndicator.style.backgroundColor = '#10b981';
                    
                    setTimeout(() => {
                        saveIndicator.textContent = originalText;
                        saveIndicator.style.backgroundColor = originalColor;
                    }, duration);
                }
            }
        }
    }

    /**
     * Refresh current view
     */
    refreshCurrentView() {
        if (this.currentView === 'board') {
            this.boardView.populateBoard();
        } else {
            this.uiRenderer.renderMindMap();
            this.advancedComponents.initializePrismHighlighting();
        }
    }

    /**
     * Clean shutdown of the application
     */
    async shutdown() {
        try {
            // Save any pending changes
            await this.syncModel.manualSave();
            
            // Clean up event listeners
            this.removeAllEventListeners();
            
            this.initialized = false;
            console.log('✅ Application shut down cleanly');
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }

    /**
     * Remove all event listeners for clean shutdown
     */
    removeAllEventListeners() {
        // Remove specific event listeners to prevent memory leaks
        const buttons = [
            'saveBtn', 'newFileBtn', 'toggleBoardView', 'toggleComments',
            'toggleDates', 'toggleAddButtons', 'toggleAll', 'toggleFlash',
            'toggleAnimateLines', 'cleanupBtn'
        ];
        
        buttons.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.replaceWith(element.cloneNode(true));
            }
        });
        
        // Note: Global keyboard listener would need more sophisticated removal
        console.log('Event listeners cleaned up');
    }

    // Getters for application state
    getCurrentView() {
        return this.currentView;
    }
    
    getVersion() {
        return this.version;
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    getApplicationState() {
        return {
            initialized: this.initialized,
            currentView: this.currentView,
            version: this.version,
            hasData: this.dataModel ? this.dataModel.getCurrentFile() !== null : false
        };
    }
}

// Create and export singleton instance
export const appController = new AppController();

// Export for backward compatibility
if (typeof window !== 'undefined') {
    window.appController = appController;
}

export default AppController;