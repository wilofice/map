/**
 * ModalView - Generic modal component system
 */
class ModalView {
    constructor() {
        this.activeModals = [];
        this.container = null;
        this.bindEvents();
        this.initialize();
    }

    /**
     * Initialize the modal system
     */
    initialize() {
        this.container = document.getElementById('modalContainer');
        if (!this.container) {
            // Create container if it doesn't exist
            this.container = document.createElement('div');
            this.container.id = 'modalContainer';
            this.container.className = 'modal-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Bind to EventBus events
     */
    bindEvents() {
        window.EventBus?.on(window.EVENTS?.UI_SHOW_MODAL, this.show.bind(this));
        window.EventBus?.on(window.EVENTS?.UI_HIDE_MODAL, this.hide.bind(this));
    }

    /**
     * Show a modal
     * @param {object} config - Modal configuration
     */
    show(config) {
        if (typeof config === 'string') {
            config = { type: config };
        }

        const modal = this.createModal(config);
        this.addModal(modal);
        return modal;
    }

    /**
     * Create modal element
     */
    createModal(config) {
        const id = 'modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        
        // Create modal content based on type
        let content = '';
        
        switch (config.type) {
            case 'project-selector':
                content = this.createProjectSelectorModal(config);
                break;
            case 'collection-manager':
                content = this.createCollectionManagerModal(config);
                break;
            default:
                content = this.createGenericModal(config);
        }

        modal.innerHTML = content;

        // Add event listeners
        this.bindModalEvents(modal, config);

        return {
            id,
            element: modal,
            config
        };
    }

    /**
     * Create project selector modal content
     */
    createProjectSelectorModal(config) {
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🔄 Project & Collection Manager</h2>
                    <button class="close-btn" onclick="window.EventBus.emit('${window.EVENTS?.UI_HIDE_MODAL}')">×</button>
                </div>
                <div class="modal-body">
                    <div class="modal-tabs">
                        <button class="tab-btn active" data-tab="projects">📋 Projects</button>
                        <button class="tab-btn" data-tab="collections">📚 Collections</button>
                    </div>
                    <div class="tab-content">
                        <div id="projectsTab" class="tab-pane active">
                            <div class="section-header">
                                <h3>All Projects</h3>
                                <button class="btn btn-sm" onclick="window.ProjectController?.createNew()">➕ New Project</button>
                            </div>
                            <div class="project-list" id="modalProjectList">
                                <div class="loading">Loading projects...</div>
                            </div>
                        </div>
                        <div id="collectionsTab" class="tab-pane">
                            <div class="section-header">
                                <h3>Collections</h3>
                                <button class="btn btn-sm" onclick="window.CollectionController?.createNew()">📚 New Collection</button>
                            </div>
                            <div class="collection-list" id="modalCollectionList">
                                <div class="loading">Loading collections...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create collection manager modal content
     */
    createCollectionManagerModal(config) {
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📚 Collection Manager</h2>
                    <button class="close-btn" onclick="window.EventBus.emit('${window.EVENTS?.UI_HIDE_MODAL}')">×</button>
                </div>
                <div class="modal-body">
                    <div class="collection-list" id="modalCollectionList">
                        <div class="loading">Loading collections...</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create generic modal content
     */
    createGenericModal(config) {
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${config.title || 'Modal'}</h2>
                    <button class="close-btn" onclick="window.EventBus.emit('${window.EVENTS?.UI_HIDE_MODAL}')">×</button>
                </div>
                <div class="modal-body">
                    ${config.content || '<p>Modal content goes here</p>'}
                </div>
                ${config.actions ? `
                    <div class="modal-footer">
                        ${config.actions.map(action => 
                            `<button class="btn ${action.class || ''}" onclick="${action.onclick || ''}">${action.text}</button>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Bind modal event listeners
     */
    bindModalEvents(modal, config) {
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // Tab switching
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(modal, tabName);
            });
        });

        // ESC key to close
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    /**
     * Switch between tabs in modal
     */
    switchTab(modal, tabName) {
        // Update tab buttons
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        modal.querySelectorAll('.tab-pane').forEach(pane => {
            if (pane.id === tabName + 'Tab') {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }

    /**
     * Add modal to container
     */
    addModal(modal) {
        this.activeModals.push(modal);
        this.container.appendChild(modal.element);

        // Trigger entrance animation
        requestAnimationFrame(() => {
            modal.element.classList.add('modal--visible');
        });

        // Load content based on type
        this.loadModalContent(modal);
    }

    /**
     * Load content for specific modal types
     */
    async loadModalContent(modal) {
        switch (modal.config.type) {
            case 'project-selector':
                await this.loadProjectSelectorContent(modal);
                break;
            case 'collection-manager':
                await this.loadCollectionManagerContent(modal);
                break;
        }
    }

    /**
     * Load project selector content
     */
    async loadProjectSelectorContent(modal) {
        try {
            // Load projects
            const projects = await window.ProjectModel?.getAllProjects() || [];
            const projectsList = modal.element.querySelector('#modalProjectList');
            
            if (projectsList) {
                if (projects.length === 0) {
                    projectsList.innerHTML = '<div class="no-projects">No projects found</div>';
                } else {
                    projectsList.innerHTML = projects.map(project => `
                        <div class="project-item" data-id="${project.id}">
                            <div class="project-content" onclick="window.ProjectController?.select('${project.id}')">
                                <div class="project-name">${project.name}</div>
                                <div class="project-info">
                                    <small>Updated: ${new Date(project.updated_at).toLocaleDateString()}</small>
                                </div>
                            </div>
                            <div class="project-actions">
                                <select class="assign-select" title="Move to collection" onchange="(function(sel){ const val=sel.value; if(val==='')return; if(val==='__none'){ window.ProjectController?.moveToCollection(null, '${project.id}'); } else { window.ProjectController?.moveToCollection(val, '${project.id}'); } sel.value=''; })(this)">
                                    <option value="">Move…</option>
                                    <option value="__none">— Remove from collection —</option>
                                    ${(window.CollectionModel?.getAllCollections?.()||[]).map(c=>`<option value="${c.id}">📚 ${c.name}</option>`).join('')}
                                </select>
                                <button class="project-delete-btn" onclick="window.ProjectController?.delete('${project.id}')" title="Delete Project">🗑️</button>
                            </div>
                        </div>
                    `).join('');
                }
            }

            // Load collections
            const collections = await window.CollectionModel?.getAllCollections() || [];
            const collectionsList = modal.element.querySelector('#modalCollectionList');
            
            if (collectionsList) {
                if (collections.length === 0) {
                    collectionsList.innerHTML = '<div class="no-collections">No collections found</div>';
                } else {
                    collectionsList.innerHTML = collections.map(collection => `
                        <div class="collection-item" data-id="${collection.id}">
                            <div class="collection-info" onclick="window.CollectionController?.select('${collection.id}')">
                                <div class="collection-name">📚 ${collection.name}</div>
                                <div class="collection-meta">
                                    ${collection.project_count || 0} projects
                                    ${collection.description ? ` • ${collection.description}` : ''}
                                </div>
                            </div>
                            <div class="collection-actions">
                                <button class="btn-icon" onclick="window.CollectionController?.edit('${collection.id}')" title="Edit Collection">✏️</button>
                                <button class="btn-icon delete" onclick="window.CollectionController?.delete('${collection.id}')" title="Delete Collection">🗑️</button>
                            </div>
                        </div>
                    `).join('');
                }
            }

        } catch (error) {
            console.error('❌ Failed to load project selector content:', error);
        }
    }

    /**
     * Load collection manager content
     */
    async loadCollectionManagerContent(modal) {
        // Implementation similar to loadProjectSelectorContent
    }

    /**
     * Hide modal(s)
     */
    hide(modalId = null) {
        if (modalId) {
            // Hide specific modal
            const modal = this.activeModals.find(m => m.id === modalId);
            if (modal) {
                this.removeModal(modal);
            }
        } else {
            // Hide topmost modal
            if (this.activeModals.length > 0) {
                const modal = this.activeModals[this.activeModals.length - 1];
                this.removeModal(modal);
            }
        }
    }

    /**
     * Remove modal from DOM
     */
    removeModal(modal) {
        const index = this.activeModals.findIndex(m => m.id === modal.id);
        if (index === -1) return;

        // Animate out
        modal.element.classList.add('modal--leaving');

        // Remove from DOM after animation
        setTimeout(() => {
            if (modal.element.parentNode) {
                modal.element.parentNode.removeChild(modal.element);
            }
            
            // Remove from array
            this.activeModals.splice(index, 1);
        }, 300);
    }

    /**
     * Close all modals
     */
    closeAll() {
        this.activeModals.forEach(modal => {
            modal.element.classList.add('modal--leaving');
        });

        setTimeout(() => {
            this.container.innerHTML = '';
            this.activeModals = [];
        }, 300);
    }

    /**
     * Check if any modal is open
     */
    hasOpenModals() {
        return this.activeModals.length > 0;
    }
}

// Create global ModalView instance
window.ModalView = new ModalView();
