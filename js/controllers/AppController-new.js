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
    }

    /**
     * Handle project selection
     */
    handleProjectSelected(data) {
        const { project, nodes } = data;
        this.currentProject = project;
        
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
        if (dbSizeEl) dbSizeEl.textContent = stats.database_size || '0 KB';
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
