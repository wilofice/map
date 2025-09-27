/**
 * CollectionView - Handles collection management UI
 */
class CollectionView {
    constructor() {
        this.collectionSelect = null;
        this.collectionNav = null;
        this.projectSelect = null;
        this.currentCollection = null;
        this.bindEvents();
        this.initialize();
    }

    initialize() {
        this.collectionSelect = document.getElementById('collectionSelect');
        this.collectionNav = document.getElementById('collectionNav');
        this.projectSelect = document.getElementById('projectSelect');

        // Add change listener to collection select
        if (this.collectionSelect) {
            this.collectionSelect.addEventListener('change', (e) => {
                const collectionId = e.target.value;
                if (collectionId) {
                    window.CollectionController?.select(collectionId);
                }
            });
        }

        // Add change listener to project select
        if (this.projectSelect) {
            this.projectSelect.addEventListener('change', (e) => {
                const projectId = e.target.value;
                if (projectId) {
                    window.ProjectController?.select(projectId);
                }
            });
        }

        // Check if collections are already loaded (in case we missed the event)
        setTimeout(() => {
            if (window.CollectionModel?.collections?.length > 0) {
                console.log('📚 CollectionView: Found existing collections, populating dropdown');
                this.populateCollectionSelect(window.CollectionModel.collections);
            }
        }, 100);
    }

    bindEvents() {
        window.EventBus?.on(window.EVENTS?.APP_READY, this.handleAppReady.bind(this));
        window.EventBus?.on(window.EVENTS?.COLLECTIONS_LOADED, this.handleCollectionsLoaded.bind(this));
        window.EventBus?.on(window.EVENTS?.COLLECTION_SELECTED, this.handleCollectionSelected.bind(this));
        window.EventBus?.on(window.EVENTS?.COLLECTION_CREATED, this.handleCollectionCreated.bind(this));
        window.EventBus?.on(window.EVENTS?.COLLECTION_UPDATED, this.handleCollectionUpdated.bind(this));
        window.EventBus?.on(window.EVENTS?.COLLECTION_DELETED, this.handleCollectionDeleted.bind(this));
    }

    handleAppReady() {
        console.log('📚 CollectionView: App ready, re-initializing DOM elements');
        this.initialize();
    }

    handleCollectionsLoaded(data) {
        console.log('📚 CollectionView: Collections loaded', data.collections.length);
        console.log('📚 CollectionView: Collection select element:', !!this.collectionSelect);
        if (this.collectionSelect) {
            console.log('📚 CollectionView: Current options count:', this.collectionSelect.children.length);
        }
        this.populateCollectionSelect(data.collections);
    }

    handleCollectionSelected(data) {
        console.log('📚 CollectionView: Collection selected', data);
        this.currentCollection = data.collection;
        this.updateCollectionDisplay(data.collection, data.projects);
        // Sync assign select options/value
        window.TopBarView?.refreshAssignOptions?.();
        const current = window.ProjectModel?.getCurrentProject?.();
        if (current) window.TopBarView?.syncAssignValue?.(current);
    }

    handleCollectionCreated(data) {
        console.log('📚 CollectionView: Collection created', data.collection);
        // Add new collection to select dropdown
        this.addCollectionToSelect(data.collection);
        // Select the newly created collection
        if (this.collectionSelect) {
            this.collectionSelect.value = data.collection.id;
        }
    }

    handleCollectionUpdated(data) {
        console.log('📚 CollectionView: Collection updated', data.collection);
        this.updateCollectionInSelect(data.collection);
    }

    handleCollectionDeleted(data) {
        console.log('📚 CollectionView: Collection deleted', data.collectionId);
        this.removeCollectionFromSelect(data.collectionId);
    }

    populateCollectionSelect(collections) {
        if (!this.collectionSelect) return;

        // Clear existing options except first one
        while (this.collectionSelect.children.length > 1) {
            this.collectionSelect.removeChild(this.collectionSelect.lastChild);
        }

        // Add collections
        collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            option.textContent = collection.name;
            this.collectionSelect.appendChild(option);
        });

        // Show nav if we have collections to choose
        if (this.collectionNav) {
            this.collectionNav.style.display = collections.length > 0 ? 'flex' : 'none';
        }

        console.log('📚 CollectionView: Populated', collections.length, 'collections in dropdown');
    }

    addCollectionToSelect(collection) {
        if (!this.collectionSelect) return;

        const option = document.createElement('option');
        option.value = collection.id;
        option.textContent = collection.name;
        this.collectionSelect.appendChild(option);
    }

    updateCollectionInSelect(collection) {
        if (!this.collectionSelect) return;

        const option = this.collectionSelect.querySelector(`option[value="${collection.id}"]`);
        if (option) {
            option.textContent = collection.name;
        }
    }

    removeCollectionFromSelect(collectionId) {
        if (!this.collectionSelect) return;

        const option = this.collectionSelect.querySelector(`option[value="${collectionId}"]`);
        if (option) {
            option.remove();
        }
    }

    updateCollectionDisplay(collection, projects) {
        // Show collection navigation
        if (this.collectionNav) {
            this.collectionNav.style.display = 'block';
        }

        // Update collection select to show current selection
        if (this.collectionSelect) {
            this.collectionSelect.value = collection.id;
        }

        // Update project select dropdown
        this.updateProjectSelect(projects, collection);
    }

    updateProjectSelect(projects, collection) {
        if (!this.projectSelect) return;

        // Clear existing options (except the first placeholder)
        this.projectSelect.innerHTML = '<option value="">Select Project</option>';

        if (!projects || projects.length === 0) {
            // Hide project select if no projects
            this.projectSelect.classList.add('hidden');
            return;
        }

        // Show project select
        this.projectSelect.classList.remove('hidden');

        // Get currently selected project
        const selectedId = window.ProjectModel?.getCurrentProject?.()?.id;

        // Populate project options
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;

            // Mark as selected if this is the current project
            if (selectedId && selectedId === project.id) {
                option.selected = true;
            }

            this.projectSelect.appendChild(option);
        });

        console.log('📚 CollectionView: Updated project select with', projects.length, 'projects');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global CollectionView instance
window.CollectionView = new CollectionView();
