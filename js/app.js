/**
 * Main Application Bootstrap
 * Initializes the MVC Mind Map application
 */

// Application entry point
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎯 Starting Mind Map MVC Application...');
    
    try {
        // Wait a moment for all scripts to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if all required components are loaded
        const requiredComponents = [
            'EventBus',
            'ApiService', 
            'ProjectModel',
            'CollectionModel',
            'NotificationView',
            'AppController'
        ];
        
        const missingComponents = requiredComponents.filter(component => !window[component]);
        
        if (missingComponents.length > 0) {
            throw new Error(`Missing components: ${missingComponents.join(', ')}`);
        }
        
        // Enable EventBus debug mode in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.EventBus.setDebugMode(true);
        }
        
        console.log('✅ All MVC components loaded successfully');
        console.log('🎉 Mind Map MVC Application ready!');
        
        // Show success notification
        setTimeout(() => {
            window.NotificationView?.success('Application initialized successfully', 3000);
        }, 1000);

        // Force refresh collections after everything is loaded
        setTimeout(async () => {
            console.log('🔄 Force refreshing collections...');
            if (window.CollectionModel && window.CollectionView) {
                try {
                    await window.CollectionModel.loadCollections();
                    console.log('✅ Collections force-refreshed successfully');
                } catch (error) {
                    console.error('❌ Failed to force-refresh collections:', error);
                }
            }
        }, 1500);

        // Restore last selected project after everything is loaded
        setTimeout(async () => {
            console.log('🔄 Attempting to restore last selected project...');
            if (window.ProjectModel) {
                try {
                    const restoredProject = await window.ProjectModel.restoreLastSelectedProject();
                    if (restoredProject) {
                        window.NotificationView?.success(`Restored project: "${restoredProject.name}"`, 3000);
                    }
                } catch (error) {
                    console.error('❌ Failed to restore last selected project:', error);
                }
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        
        // Show error in UI
        const container = document.getElementById('mindMapContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h3>❌ Initialization Error</h3>
                    <p>${error.message}</p>
                    <p>Please check the console for more details.</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        🔄 Reload Application
                    </button>
                </div>
            `;
        }
    }
});

// Handle application errors globally
window.addEventListener('error', function(event) {
    console.error('❌ Global error:', event.error);
    
    window.NotificationView?.error(
        `Application error: ${event.error?.message || 'Unknown error'}`,
        8000
    );
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled promise rejection:', event.reason);
    
    window.NotificationView?.error(
        `Promise rejection: ${event.reason?.message || 'Unknown error'}`,
        8000
    );
});

// Expose application state for debugging
window.getMindMapState = function() {
    return {
        app: window.AppController?.getState(),
        projects: window.ProjectModel?.getCacheStats(),
        collections: window.CollectionModel?.getCacheStats(),
        notifications: window.NotificationView?.getStats(),
        events: window.EventBus?.getEvents()
    };
};

console.log('📊 Debug: Use getMindMapState() to inspect application state');
