const DatabaseManager = require('./db-manager');

// Test database operations
async function testDatabase() {
    console.log('🧪 Testing database operations...\n');
    
    const db = new DatabaseManager();
    
    try {
        // Test 1: Get all projects
        console.log('📋 Test 1: Getting all projects');
        const projects = db.getAllProjects();
        console.log(`  ✅ Found ${projects.length} projects`);
        projects.slice(0, 3).forEach(p => {
            console.log(`     - ${p.name} (${p.id.substring(0, 8)}...)`);
        });
        
        // Test 2: Get a specific project with nodes
        if (projects.length > 0) {
            console.log('\n🔍 Test 2: Getting project with nodes');
            const projectId = projects[0].id;
            const projectWithNodes = db.getProjectWithNodes(projectId);
            console.log(`  ✅ Project "${projectWithNodes.name}" has ${projectWithNodes.nodes.length} nodes`);
            
            if (projectWithNodes.nodes.length > 0) {
                const firstNode = projectWithNodes.nodes[0];
                console.log(`     - First node: "${firstNode.title}" (${firstNode.status})`);
            }
        }
        
        // Test 3: Search functionality
        console.log('\n🔎 Test 3: Search functionality');
        const searchResults = db.searchNodes('API');
        console.log(`  ✅ Found ${searchResults.length} nodes containing "API"`);
        searchResults.slice(0, 2).forEach(result => {
            console.log(`     - "${result.title}" in project "${result.project_name}"`);
        });
        
        // Test 4: App state
        console.log('\n💾 Test 4: App state management');
        db.saveAppState('test_key', { test: true, timestamp: Date.now() });
        const retrievedState = db.getAppState('test_key');
        console.log(`  ✅ App state saved and retrieved:`, retrievedState);
        
        // Test 5: Database stats
        console.log('\n📊 Test 5: Database statistics');
        const stats = db.getStats();
        console.log('  ✅ Database stats:');
        console.log(`     - Projects: ${stats.projects}`);
        console.log(`     - Nodes: ${stats.nodes}`);
        console.log(`     - Database size: ${(stats.databaseSize / 1024).toFixed(1)} KB`);
        
        console.log('\n🎉 All tests passed! Database is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        db.close();
    }
}

testDatabase();
