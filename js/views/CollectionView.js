/**
 * CollectionView - Handles collection management UI
 */
class CollectionView {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus?.on(window.EVENTS?.COLLECTION_SELECTED, this.handleCollectionSelected.bind(this));
    }

    handleCollectionSelected(data) {
        console.log('📚 CollectionView: Collection selected', data);
    }
}

// Create global CollectionView instance
window.CollectionView = new CollectionView();
