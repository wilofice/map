/**
 * CollectionController - Handles collection-related user actions
 */
class CollectionController {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus?.on(window.EVENTS?.APP_READY, this.handleAppReady.bind(this));
    }

    async handleAppReady() {
        console.log('📚 CollectionController: Ready');
        // Load collections when app is ready
        try {
            await window.CollectionModel?.loadCollections();
        } catch (error) {
            console.error('❌ Failed to load collections on startup:', error);
        }
    }

    /**
     * Select a collection
     */
    async select(collectionId) {
        try {
            await window.CollectionModel?.selectCollection(collectionId);
            window.EventBus?.emit(window.EVENTS?.UI_HIDE_MODAL);
        } catch (error) {
            console.error('❌ Failed to select collection:', error);
            window.NotificationView?.error('Failed to select collection: ' + error.message);
        }
    }

    /**
     * Create new collection
     */
    async createNew() {
        const name = prompt('Enter collection name:');
        if (!name || !name.trim()) return;

        const description = prompt('Enter collection description (optional):') || '';

        try {
            const collectionData = { name: name.trim(), description };
            await window.CollectionModel?.createCollection(collectionData);
        } catch (error) {
            console.error('❌ Failed to create collection:', error);
            window.NotificationView?.error('Failed to create collection: ' + error.message);
        }
    }

    /**
     * Edit collection
     */
    async edit(collectionId) {
        try {
            const collection = await window.CollectionModel?.getCollection(collectionId);
            if (!collection) return;

            const newName = prompt('Enter new collection name:', collection.name);
            if (!newName) return;

            const newDescription = prompt('Enter new description (optional):', collection.description || '') || '';

            const updatedData = { name: newName, description: newDescription };
            await window.CollectionModel?.updateCollection(collectionId, updatedData);

        } catch (error) {
            console.error('❌ Failed to edit collection:', error);
            window.NotificationView?.error('Failed to edit collection: ' + error.message);
        }
    }

    /**
     * Delete collection
     */
    async delete(collectionId) {
        const collection = await window.CollectionModel?.getCollection(collectionId);
        if (!collection) return;

        const confirmed = confirm(`Are you sure you want to delete collection "${collection.name}"?\n\nProjects will not be deleted, just removed from the collection.`);
        if (!confirmed) return;

        try {
            await window.CollectionModel?.deleteCollection(collectionId);
        } catch (error) {
            console.error('❌ Failed to delete collection:', error);
            window.NotificationView?.error('Failed to delete collection: ' + error.message);
        }
    }
}

// Create global CollectionController instance
window.CollectionController = new CollectionController();
