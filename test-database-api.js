#!/usr/bin/env node

// Test script for the new database API endpoints
const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3333,
            path: `/api/db${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testDatabaseAPI() {
    console.log('🧪 Testing Database API Endpoints...\n');

    try {
        // Test 1: Get all projects
        console.log('1. Testing GET /api/db/projects');
        const projectsResponse = await makeRequest('/projects');
        console.log(`   Status: ${projectsResponse.status}`);
        if (projectsResponse.status === 200) {
            console.log(`   ✅ Found ${projectsResponse.data.length} projects`);
            console.log(`   First project: ${projectsResponse.data[0]?.name}`);
        } else {
            console.log(`   ❌ Error: ${projectsResponse.data.error}`);
        }

        // Test 2: Get specific project
        if (projectsResponse.status === 200 && projectsResponse.data.length > 0) {
            console.log('\n2. Testing GET /api/db/projects/:id');
            const projectId = projectsResponse.data[0].id;
            const projectResponse = await makeRequest(`/projects/${projectId}`);
            console.log(`   Status: ${projectResponse.status}`);
            if (projectResponse.status === 200) {
                console.log(`   ✅ Project: "${projectResponse.data.name}"`);
                console.log(`   ✅ Nodes: ${projectResponse.data.nodes.length}`);
            } else {
                console.log(`   ❌ Error: ${projectResponse.data.error}`);
            }
        }

        // Test 3: Search functionality
        console.log('\n3. Testing GET /api/db/search');
        const searchResponse = await makeRequest('/search?q=API');
        console.log(`   Status: ${searchResponse.status}`);
        if (searchResponse.status === 200) {
            console.log(`   ✅ Search results: ${searchResponse.data.length} nodes found`);
            if (searchResponse.data.length > 0) {
                console.log(`   First result: "${searchResponse.data[0].title}"`);
            }
        } else {
            console.log(`   ❌ Error: ${searchResponse.data.error}`);
        }

        // Test 4: App state
        console.log('\n4. Testing GET /api/db/app-state');
        const stateResponse = await makeRequest('/app-state');
        console.log(`   Status: ${stateResponse.status}`);
        if (stateResponse.status === 200) {
            console.log(`   ✅ App state retrieved`);
            console.log(`   Last project: ${stateResponse.data.lastProject || 'None'}`);
            console.log(`   UI settings:`, stateResponse.data.uiSettings);
        } else {
            console.log(`   ❌ Error: ${stateResponse.data.error}`);
        }

        // Test 5: Database stats
        console.log('\n5. Testing GET /api/db/stats');
        const statsResponse = await makeRequest('/stats');
        console.log(`   Status: ${statsResponse.status}`);
        if (statsResponse.status === 200) {
            console.log(`   ✅ Database stats:`);
            console.log(`     Projects: ${statsResponse.data.projects}`);
            console.log(`     Nodes: ${statsResponse.data.nodes}`);
            console.log(`     Size: ${(statsResponse.data.databaseSize / 1024).toFixed(1)} KB`);
        } else {
            console.log(`   ❌ Error: ${statsResponse.data.error}`);
        }

        console.log('\n🎉 Database API testing completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nℹ️  Make sure the server is running with: npm start');
    }
}

testDatabaseAPI();
