/**
 * TopBarView - Manages the top navigation bar
 */
class TopBarView {
    constructor() {
        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        // Bind to EventBus events
        window.EventBus?.on(window.EVENTS?.APP_READY, this.handleAppReady.bind(this));
    }

    initialize() {
        // Setup event listeners for top bar buttons
        this.setupButtonEvents();
    }

    setupButtonEvents() {
        // Switch Project Button
        document.getElementById('switchProjectBtn')?.addEventListener('click', () => {
            window.EventBus?.emit(window.EVENTS?.UI_SHOW_MODAL, {
                type: 'project-selector'
            });
        });

        // New Project Button
        document.getElementById('newProjectBtn')?.addEventListener('click', () => {
            window.ProjectController?.createNew();
        });

        // New Collection Button
        document.getElementById('newCollectionBtn')?.addEventListener('click', () => {
            window.CollectionController?.createNew();
        });

        // Search Projects Button
        document.getElementById('searchProjectsBtn')?.addEventListener('click', () => {
            const query = prompt('Enter search term:');
            if (query) {
                window.ProjectController?.search(query);
            }
        });

        // Top bar toggle
        document.getElementById('topBarToggle')?.addEventListener('click', () => {
            const topBar = document.querySelector('.top-bar');
            topBar?.classList.toggle('collapsed');
        });
    }

    handleAppReady() {
        console.log('📊 TopBarView: Application ready');
    }
}

// Create global TopBarView instance
window.TopBarView = new TopBarView();
