/**
 * Test the modular MVC application
 */

// Test function to verify all components are loaded
function testMVCApplication() {
    console.log('🧪 Testing MVC Application Components...');
    
    // Check if all required components exist
    const requiredComponents = [
        'EventBus',
        'EVENTS', 
        'ApiService',
        'ProjectModel',
        'CollectionModel',
        'NotificationView',
        'ModalView',
        'TopBarView',
        'MindMapView',
        'AppController',
        'ProjectController',
        'CollectionController'
    ];
    
    const results = {};
    let passedTests = 0;
    let totalTests = requiredComponents.length;
    
    requiredComponents.forEach(component => {
        const exists = window[component] !== undefined;
        results[component] = exists ? '✅ PASS' : '❌ FAIL';
        if (exists) passedTests++;
    });
    
    console.log('📊 Component Test Results:');
    Object.keys(results).forEach(component => {
        console.log(`  ${component}: ${results[component]}`);
    });
    
    console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} components loaded`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All MVC components loaded successfully!');
        
        // Test EventBus
        console.log('\n🔗 Testing EventBus...');
        window.EventBus.emit('test:event', 'Hello MVC!');
        
        // Test notification system
        console.log('📢 Testing Notification System...');
        window.NotificationView?.success('MVC Application test successful! 🎉');
        
        return true;
    } else {
        console.log('❌ Some components failed to load');
        return false;
    }
}

// Test API connectivity
async function testApiConnectivity() {
    console.log('🌐 Testing API connectivity...');
    
    try {
        const connected = await window.ApiService?.testConnection();
        if (connected) {
            console.log('✅ API connection successful');
            window.NotificationView?.success('API connection established');
            return true;
        } else {
            console.log('❌ API connection failed');
            window.NotificationView?.error('Failed to connect to API');
            return false;
        }
    } catch (error) {
        console.log('❌ API test error:', error);
        window.NotificationView?.error('API test error: ' + error.message);
        return false;
    }
}

// Test modal system
function testModalSystem() {
    console.log('🎭 Testing Modal System...');
    
    // Test opening project selector modal
    window.EventBus?.emit(window.EVENTS?.UI_SHOW_MODAL, {
        type: 'project-selector'
    });
    
    setTimeout(() => {
        // Close modal after 3 seconds
        window.EventBus?.emit(window.EVENTS?.UI_HIDE_MODAL);
        console.log('✅ Modal system test completed');
    }, 3000);
}

// Run comprehensive test
async function runMVCTests() {
    console.log('🚀 Starting comprehensive MVC application tests...\n');
    
    // Wait for DOM to be ready
    if (document.readyState !== 'complete') {
        console.log('⏳ Waiting for DOM to be ready...');
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
    
    // Test 1: Component loading
    const componentTest = testMVCApplication();
    
    if (componentTest) {
        // Test 2: API connectivity
        await testApiConnectivity();
        
        // Test 3: Modal system (after a short delay)
        setTimeout(() => {
            testModalSystem();
        }, 2000);
        
        console.log('\n🏁 All tests completed!');
        console.log('💡 Try clicking the "🔄" button in the top bar to test the project selector!');
    }
}

// Auto-run tests when page loads only if explicitly enabled
(function maybeAutoRunTests() {
    try {
        const params = new URLSearchParams(window.location.search);
        const testFlag = params.get('test') || localStorage.getItem('mvc:test:auto');
        if (String(testFlag).toLowerCase() === 'true' || testFlag === '1') {
            if (document.readyState === 'complete') {
                setTimeout(runMVCTests, 1000);
            } else {
                window.addEventListener('load', () => setTimeout(runMVCTests, 1000));
            }
        } else {
            console.log('🧪 MVC Test Suite loaded. Auto-run is disabled. Pass ?test=true or set localStorage mvc:test:auto=true to enable.');
        }
    } catch (e) {
        console.warn('Test auto-run guard failed:', e);
    }
})();

// Expose test functions globally for manual testing
window.testMVCApplication = testMVCApplication;
window.testApiConnectivity = testApiConnectivity;
window.testModalSystem = testModalSystem;
window.runMVCTests = runMVCTests;

console.log('🧪 MVC Test Suite loaded. Use runMVCTests() to run all tests manually.');
