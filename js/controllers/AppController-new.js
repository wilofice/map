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
     * Bind to EventBus events
     */
    bindEvents() {
        // Project events
        window.EventBus?.on(window.EVENTS?.PROJECT_SELECTED, this.handleProjectSelected.bind(this));
        window.EventBus?.on(window.EVENTS?.COLLECTION_SELECTED, this.handleCollectionSelected.bind(this));
        
        // Data events
        window.EventBus?.on(window.EVENTS?.DATA_ERROR, this.handleDataError.bind(this));
        
        // UI events
        document.addEventListener('DOMContentLoaded', this.handleDOMReady.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing Mind Map MVC Application...');
            
            // Test API connection first
            const apiConnected = await window.ApiService?.testConnection();
            if (!apiConnected) {
                throw new Error('Cannot connect to backend API');
            }

            // Emit initialization event
            window.EventBus?.emit(window.EVENTS?.APP_INIT);
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize UI
            this.initializeUI();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Emit ready event
            window.EventBus?.emit(window.EVENTS?.APP_READY);
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Handle DOM ready event
     */
    handleDOMReady() {
        console.log('📄 DOM Content Loaded');
        
        // Initialize views that need DOM
        this.initializeDOMDependentComponents();
    }

    /**
     * Initialize components that depend on DOM being ready
     */
    initializeDOMDependentComponents() {
        // Update loading indicator
        const container = document.getElementById('mindMapContainer');
        if (container) {
            container.innerHTML = '<div class="empty-state">Ready to load a project</div>';
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load database statistics
            await this.updateDatabaseStats();
            
            // Projects and collections will be loaded by their respective models
            // via the APP_INIT event
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            throw error;
        }
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        // Hide loading indicator
        this.hideLoadingIndicator();

        // Show top bar
        const topBar = document.getElementById('topBar');
        if (topBar) {
            topBar.style.display = 'flex';
        }

        // Setup control button event listeners
        this.setupControlEvents();
    }

    /**
     * Handle project selection
     */
    handleProjectSelected(data) {
        const { project, nodes } = data;
        this.currentProject = project;
        this.currentData = { nodes: nodes || [] };

        console.log(`📝 Project selected: ${project.name}`);

        // Update UI
        this.updateProjectDisplay(project);

        // Show controls and progress
        this.showProjectControls();

        // Update stats
        this.updateDatabaseStats();
    }

    /**
     * Handle collection selection
     */
    handleCollectionSelected(data) {
        const { collection, projects } = data;
        this.currentCollection = collection;
        
        if (collection) {
            console.log(`📚 Collection selected: ${collection.name}`);
        } else {
            console.log('📚 Collection cleared');
        }
        
        // Update UI
        this.updateCollectionDisplay(collection, projects);
    }

    /**
     * Update project display
     */
    updateProjectDisplay(project) {
        const projectNameEl = document.getElementById('currentProjectName');
        if (projectNameEl) {
            projectNameEl.textContent = project ? project.name : 'No project loaded';
        }
    }

    /**
     * Update collection display
     */
    updateCollectionDisplay(collection, projects) {
        const collectionNav = document.getElementById('collectionNav');
        const collectionSelect = document.getElementById('collectionSelect');
        
        if (collection && projects) {
            // Show collection navigation
            if (collectionNav) {
                collectionNav.style.display = 'block';
            }
            
            // Update collection select
            if (collectionSelect) {
                collectionSelect.value = collection.id;
            }
            
        } else {
            // Hide collection navigation
            if (collectionNav) {
                collectionNav.style.display = 'none';
            }
        }
    }

    /**
     * Show project controls
     */
    showProjectControls() {
        const controls = document.getElementById('controls');
        const progressContainer = document.getElementById('progressContainer');
        
        if (controls) {
            controls.style.display = 'block';
        }
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }

    /**
     * Update database statistics
     */
    async updateDatabaseStats() {
        try {
            const stats = await window.ApiService?.getStats();
            if (stats) {
                this.displayStats(stats);
            }
        } catch (error) {
            console.error('❌ Failed to update database stats:', error);
        }
    }

    /**
     * Display statistics in UI
     */
    displayStats(stats) {
        const projectCountEl = document.getElementById('projectCount');
        const nodeCountEl = document.getElementById('nodeCount');
        const dbSizeEl = document.getElementById('dbSize');

        if (projectCountEl) projectCountEl.textContent = stats.projects || 0;
        if (nodeCountEl) nodeCountEl.textContent = stats.nodes || 0;
        if (dbSizeEl) {
            // Convert bytes to KB and format
            const sizeInKB = Math.round((stats.databaseSize || 0) / 1024);
            dbSizeEl.textContent = `${sizeInKB} KB`;
        }
    }

    /**
     * Handle data errors
     */
    handleDataError(data) {
        const { endpoint, error } = data;
        console.error(`❌ Data error [${endpoint}]:`, error);
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        const container = document.getElementById('mindMapContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h3>❌ Application Error</h3>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
        
        // Show notification
        window.NotificationView?.error(
            'Application failed to initialize: ' + error.message,
            0, // Persistent
            {
                action: {
                    text: 'Reload',
                    callback: () => window.location.reload()
                }
            }
        );
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + S to save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.saveCurrentProject();
        }
        
        // Ctrl/Cmd + N to create new project
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            window.EventBus?.emit(window.EVENTS?.UI_SHOW_MODAL, {
                type: 'project-selector'
            });
        }
        
        // Escape to close modals
        if (event.key === 'Escape') {
            window.EventBus?.emit(window.EVENTS?.UI_HIDE_MODAL);
        }
    }

    /**
     * Save current project
     */
    async saveCurrentProject() {
        if (!this.currentProject) {
            window.NotificationView?.warning('No project selected to save');
            return;
        }
        
        try {
            // Emit save event (handled by appropriate controller)
            window.EventBus?.emit(window.EVENTS?.DATA_SAVED, {
                projectId: this.currentProject.id
            });
            
        } catch (error) {
            console.error('❌ Failed to save project:', error);
            window.NotificationView?.error('Failed to save project: ' + error.message);
        }
    }

    /**
     * Handle before unload (page close)
     */
    handleBeforeUnload(event) {
        console.log('🔄 Application unloading...');
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        const loadingElements = document.querySelectorAll('.loading-indicator');
        loadingElements.forEach(el => {
            el.style.display = 'none';
        });
    }

    /**
     * Setup control button event listeners
     */
    setupControlEvents() {
        // UI Control Buttons
        document.getElementById('toggleCommentsBtn')?.addEventListener('click', () => {
            if (window.uiController) {
                window.uiController.toggleAllComments();
            }
        });

        document.getElementById('toggleDatesBtn')?.addEventListener('click', () => {
            if (window.uiController) {
                window.uiController.toggleAllDates();
            }
        });

        document.getElementById('toggleAddBtn')?.addEventListener('click', () => {
            if (window.uiController) {
                window.uiController.toggleAllAddButtons();
            }
        });

        document.getElementById('toggleAllBtn')?.addEventListener('click', () => {
            if (window.uiController) {
                window.uiController.toggleAllNodes();
            }
        });

        document.getElementById('toggleFlashBtn')?.addEventListener('click', () => {
            if (window.uiController) {
                window.uiController.toggleFlash();
            }
        });

        document.getElementById('toggleAnimateLinesBtn')?.addEventListener('click', () => {
            if (window.uiController) {
                window.uiController.toggleAnimateLines();
            }
        });

        // Board View Button
        document.getElementById('toggleViewBtn')?.addEventListener('click', () => {
            this.toggleBoardView();
        });

        // Export Button
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportJSON();
        });

        // Save Button
        document.getElementById('saveBtn')?.addEventListener('click', () => {
            this.manualSave();
        });
    }

    /**
     * Toggle between mind map and board view
     */
    toggleBoardView() {
        const mindMapContainer = document.getElementById('mindMapContainer');
        const boardContainer = document.getElementById('boardContainer');
        const toggleBtn = document.getElementById('toggleViewBtn');

        if (!mindMapContainer || !boardContainer || !toggleBtn) return;

        const isBoardView = boardContainer.style.display === 'block';

        if (isBoardView) {
            // Switch to mind map view
            mindMapContainer.style.display = 'block';
            boardContainer.style.display = 'none';
            toggleBtn.innerHTML = '📋 <span class="btn-text">Board View</span>';
            toggleBtn.classList.remove('btn-success');
            toggleBtn.classList.add('btn-info');
        } else {
            // Switch to board view
            mindMapContainer.style.display = 'none';
            boardContainer.style.display = 'block';
            toggleBtn.innerHTML = '🧠 <span class="btn-text">Mind Map</span>';
            toggleBtn.classList.remove('btn-info');
            toggleBtn.classList.add('btn-success');

            // Populate board view
            this.populateBoardView();
        }
    }

    /**
     * Populate board view with current project data
     */
    populateBoardView() {
        if (!this.currentData || !this.currentData.nodes) {
            this.showEmptyBoard();
            return;
        }

        // Get all nodes recursively
        const allNodes = [];
        this.collectNodesRecursively(this.currentData.nodes, allNodes);

        // Group by status
        const todoNodes = allNodes.filter(node => !node.status || node.status === 'pending');
        const inProgressNodes = allNodes.filter(node => node.status === 'in-progress');
        const doneNodes = allNodes.filter(node => node.status === 'completed');

        // Populate columns
        this.populateBoardColumn('todoCards', todoNodes);
        this.populateBoardColumn('inProgressCards', inProgressNodes);
        this.populateBoardColumn('doneCards', doneNodes);

        // Update counts
        document.getElementById('todoCount').textContent = todoNodes.length;
        document.getElementById('inProgressBoardCount').textContent = inProgressNodes.length;
        document.getElementById('doneCount').textContent = doneNodes.length;

        console.log('📋 Board view populated with', allNodes.length, 'nodes');
    }

    /**
     * Collect nodes recursively from hierarchical structure
     */
    collectNodesRecursively(nodes, allNodes, parentPath = '') {
        if (!Array.isArray(nodes)) return;

        nodes.forEach(node => {
            const nodePath = parentPath ? `${parentPath} > ${node.title}` : node.title;
            allNodes.push({
                ...node,
                path: nodePath,
                parentPath: parentPath
            });

            if (node.children && Array.isArray(node.children)) {
                this.collectNodesRecursively(node.children, allNodes, nodePath);
            }
        });
    }

    /**
     * Populate a board column with nodes
     */
    populateBoardColumn(containerId, nodes) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (nodes.length === 0) {
            container.innerHTML = '<div class="empty-column">No tasks</div>';
            return;
        }

        container.innerHTML = nodes.map(node => this.createTaskCard(node)).join('');
    }

    /**
     * Create a task card for board view
     */
    createTaskCard(node) {
        const priorityClass = node.priority ? `priority-${node.priority}` : '';
        const title = node.title || 'Untitled Task';
        const path = node.path || '';

        return `
            <div class="task-card ${priorityClass}" data-node-id="${node.id}">
                <div class="task-title">${title}</div>
                ${path !== title ? `<div class="task-path">${path}</div>` : ''}
                ${node.comment ? `<div class="task-comment">${node.comment}</div>` : ''}
            </div>
        `;
    }

    /**
     * Show empty board state
     */
    showEmptyBoard() {
        const columns = ['todoCards', 'inProgressCards', 'doneCards'];
        columns.forEach(columnId => {
            const container = document.getElementById(columnId);
            if (container) {
                container.innerHTML = '<div class="empty-column">No data loaded</div>';
            }
        });

        // Reset counters
        document.getElementById('todoCount').textContent = '0';
        document.getElementById('inProgressBoardCount').textContent = '0';
        document.getElementById('doneCount').textContent = '0';
    }

    /**
     * Export current project as JSON with hierarchical structure
     */
    exportJSON() {
        if (!this.currentProject || !this.currentData) {
            window.NotificationView?.warning('No project loaded to export');
            return;
        }

        try {
            // Create hierarchical JSON structure
            const jsonData = {
                type: "project_plan",
                version: "1.0",
                name: this.currentProject.name,
                description: this.currentProject.description,
                nodes: this.currentData.nodes || []
            };

            // Create and download file
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.NotificationView?.success(`Exported ${this.currentProject.name} as JSON`);
            console.log('📤 Project exported as JSON');
        } catch (error) {
            console.error('Export failed:', error);
            window.NotificationView?.error('Export failed: ' + error.message);
        }
    }

    /**
     * Manual save current project
     */
    async manualSave() {
        if (!this.currentProject) {
            window.NotificationView?.warning('No project loaded to save');
            return;
        }

        try {
            // Save via ProjectModel
            if (window.ProjectModel) {
                await window.ProjectModel.saveProject(this.currentProject.id, this.currentData);
                window.NotificationView?.success('Project saved successfully');
                console.log('💾 Project saved manually');
            }
        } catch (error) {
            console.error('Save failed:', error);
            window.NotificationView?.error('Save failed: ' + error.message);
        }
    }

    /**
     * Get application state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            currentProject: this.currentProject,
            currentCollection: this.currentCollection,
            timestamp: Date.now()
        };
    }

    /**
     * Check if application is ready
     */
    isReady() {
        return this.isInitialized;
    }
}

// Create global AppController instance
window.AppController = new AppController();
