/**
 * Debug Collection Issues
 * Add this to browser console to debug collection loading
 */

function debugCollections() {
    console.log('🔍 Debugging Collection Issues...');
    
    // Check if collections are loaded
    console.log('📦 Collections in model:', window.CollectionModel?.collections?.length || 0);
    
    // Check if collection select exists and has options
    const select = document.getElementById('collectionSelect');
    console.log('🎛️ Collection select options:', select?.children?.length || 0);
    
    if (select) {
        Array.from(select.children).forEach((option, i) => {
            console.log(`   ${i}: "${option.textContent}" (value: ${option.value})`);
        });
    }
    
    // Check collection nav visibility
    const nav = document.getElementById('collectionNav');
    console.log('👁️ Collection nav display:', nav?.style?.display || 'default');
    
    // Manual collection loading test
    console.log('🔄 Manually loading collections...');
    window.CollectionModel?.loadCollections()
        .then(() => console.log('✅ Manual load successful'))
        .catch(err => console.error('❌ Manual load failed:', err));
        
    // Listen for collection events
    console.log('👂 Setting up event listeners...');
    window.EventBus?.on('collections:loaded', (data) => {
        console.log('🎉 COLLECTIONS_LOADED event received:', data.collections?.length);
    });
}

// Auto-run in 2 seconds
setTimeout(() => {
    debugCollections();
}, 2000);
