/**
 * CollectionModel - Handles collection data management and business logic
 */
class CollectionModel {
    constructor(apiService) {
        this.api = apiService || window.ApiService;
        this.currentCollection = null;
        this.collections = [];
        this.cache = new Map();
        this.bindEvents();
    }

    /**
     * Bind to EventBus events
     */
    bindEvents() {
        window.EventBus?.on(window.EVENTS?.APP_INIT, this.initialize.bind(this));
    }

    /**
     * Initialize the model
     */
    async initialize() {
        try {
            await this.loadCollections();
        } catch (error) {
            console.error('❌ CollectionModel initialization failed:', error);
        }
    }

    /**
     * Load all collections from API
     */
    async loadCollections() {
        try {
            this.collections = await this.api.getCollections();
            
            // Cache collections for quick access
            this.collections.forEach(collection => {
                this.cache.set(collection.id, collection);
            });

            return this.collections;
        } catch (error) {
            console.error('❌ Failed to load collections:', error);
            throw error;
        }
    }

    /**
     * Get collection by ID (with caching)
     */
    async getCollection(collectionId, forceRefresh = false) {
        // Return from cache if available and not forcing refresh
        if (!forceRefresh && this.cache.has(collectionId)) {
            return this.cache.get(collectionId);
        }

        try {
            const collection = await this.api.getCollection(collectionId);
            this.cache.set(collectionId, collection);
            return collection;
        } catch (error) {
            console.error(`❌ Failed to get collection ${collectionId}:`, error);
            throw error;
        }
    }

    /**
     * Create new collection
     */
    async createCollection(collectionData) {
        try {
            // Validate required fields
            this.validateCollectionData(collectionData);

            const collection = await this.api.createCollection(collectionData);
            
            // Add to local cache and collections array
            this.collections.push(collection);
            this.cache.set(collection.id, collection);

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.COLLECTION_CREATED, { collection });

            return collection;
        } catch (error) {
            console.error('❌ Failed to create collection:', error);
            throw error;
        }
    }

    /**
     * Update collection
     */
    async updateCollection(collectionId, collectionData) {
        try {
            // Validate data
            this.validateCollectionData(collectionData, false);

            const updatedCollection = await this.api.updateCollection(collectionId, collectionData);
            
            // Update cache and collections array
            this.cache.set(collectionId, updatedCollection);
            const index = this.collections.findIndex(c => c.id === collectionId);
            if (index !== -1) {
                this.collections[index] = updatedCollection;
            }

            // Update current collection if it's the one being updated
            if (this.currentCollection && this.currentCollection.id === collectionId) {
                this.currentCollection = updatedCollection;
            }

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.COLLECTION_UPDATED, { collection: updatedCollection });

            return updatedCollection;
        } catch (error) {
            console.error(`❌ Failed to update collection ${collectionId}:`, error);
            throw error;
        }
    }

    /**
     * Delete collection
     */
    async deleteCollection(collectionId) {
        try {
            await this.api.deleteCollection(collectionId);
            
            // Remove from cache and collections array
            this.cache.delete(collectionId);
            this.collections = this.collections.filter(c => c.id !== collectionId);

            // Clear current collection if it's the one being deleted
            if (this.currentCollection && this.currentCollection.id === collectionId) {
                this.currentCollection = null;
            }

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.COLLECTION_DELETED, { collectionId });

        } catch (error) {
            console.error(`❌ Failed to delete collection ${collectionId}:`, error);
            throw error;
        }
    }

    /**
     * Select collection and load its projects
     */
    async selectCollection(collectionId) {
        try {
            const collection = await this.getCollection(collectionId);
            this.currentCollection = collection;

            // Load collection projects
            const projects = await this.api.getCollectionProjects(collectionId);
            collection.projects = projects;

            // Emit event for UI updates
            window.EventBus?.emit(window.EVENTS?.COLLECTION_SELECTED, { 
                collection: this.currentCollection,
                projects 
            });

            return this.currentCollection;
        } catch (error) {
            console.error(`❌ Failed to select collection ${collectionId}:`, error);
            throw error;
        }
    }

    /**
     * Get collection projects
     */
    async getCollectionProjects(collectionId) {
        try {
            return await this.api.getCollectionProjects(collectionId);
        } catch (error) {
            console.error(`❌ Failed to get collection projects:`, error);
            throw error;
        }
    }

    /**
     * Get current collection
     */
    getCurrentCollection() {
        return this.currentCollection;
    }

    /**
     * Get all collections
     */
    getAllCollections() {
        return this.collections;
    }

    /**
     * Clear current collection
     */
    clearCurrentCollection() {
        this.currentCollection = null;
        window.EventBus?.emit(window.EVENTS?.COLLECTION_SELECTED, { 
            collection: null,
            projects: [] 
        });
    }

    /**
     * Validate collection data
     */
    validateCollectionData(data, requireName = true) {
        if (requireName && (!data.name || data.name.trim() === '')) {
            throw new Error('Collection name is required');
        }

        if (data.name && data.name.length > 100) {
            throw new Error('Collection name cannot exceed 100 characters');
        }

        if (data.description && data.description.length > 500) {
            throw new Error('Collection description cannot exceed 500 characters');
        }
    }

    /**
     * Get collection statistics
     */
    getCollectionStats() {
        const stats = {
            totalCollections: this.collections.length,
            collectionsWithProjects: 0,
            currentCollection: this.currentCollection?.name || 'None'
        };

        this.collections.forEach(collection => {
            if (collection.project_count && collection.project_count > 0) {
                stats.collectionsWithProjects++;
            }
        });

        return stats;
    }

    /**
     * Search collections by name
     */
    searchCollections(query) {
        const searchTerm = query.toLowerCase();
        return this.collections.filter(collection => 
            collection.name.toLowerCase().includes(searchTerm) ||
            (collection.description && collection.description.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            collections: this.collections.length,
            currentCollection: this.currentCollection?.name || 'None'
        };
    }
}

// Create global CollectionModel instance
window.CollectionModel = new CollectionModel();
