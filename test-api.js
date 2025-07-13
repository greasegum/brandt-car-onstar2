/**
 * Test script for Brandt Car API
 * Run this to verify the REST API endpoints work correctly
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const API_KEY = process.env.API_KEY || 'brandt-car-boltaire-2025';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

async function testEndpoint(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        console.log(`✅ ${method} ${endpoint}: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        return true;
    } catch (error) {
        console.log(`❌ ${method} ${endpoint}: ${error.response?.status || 'Connection failed'}`);
        if (error.response?.data) {
            console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return false;
    }
}

async function runTests() {
    console.log('🚗 Testing Brandt Car API...\n');
    
    // Test health endpoint (no auth required)
    console.log('1. Testing health endpoint...');
    await testEndpoint('GET', '/health');
    console.log('');
    
    // Test capabilities endpoint
    console.log('2. Testing capabilities endpoint...');
    await testEndpoint('GET', '/capabilities');
    console.log('');
    
    // Test vehicle status
    console.log('3. Testing vehicle status...');
    await testEndpoint('GET', '/status');
    console.log('');
    
    // Test location
    console.log('4. Testing vehicle location...');
    await testEndpoint('GET', '/location');
    console.log('');
    
    // Test diagnostics
    console.log('5. Testing vehicle diagnostics...');
    await testEndpoint('GET', '/diagnostics');
    console.log('');
    
    // Test climate start (with data)
    console.log('6. Testing climate start...');
    await testEndpoint('POST', '/climate/start', {
        duration_minutes: 5,
        force: false
    });
    console.log('');
    
    // Test door lock
    console.log('7. Testing door lock...');
    await testEndpoint('POST', '/doors/lock');
    console.log('');
    
    // Test door unlock
    console.log('8. Testing door unlock...');
    await testEndpoint('POST', '/doors/unlock');
    console.log('');
    
    // Test light alert
    console.log('9. Testing light alert...');
    await testEndpoint('POST', '/alert/lights', {
        duration_seconds: 5
    });
    console.log('');
    
    // Test horn alert
    console.log('10. Testing horn alert...');
    await testEndpoint('POST', '/alert/horn');
    console.log('');
    
    // Test climate stop
    console.log('11. Testing climate stop...');
    await testEndpoint('POST', '/climate/stop');
    console.log('');
    
    console.log('🎉 API testing completed!');
    console.log('\nNote: Some endpoints may fail if the vehicle is not responding or if rate limits are in effect.');
    console.log('This is normal behavior for OnStar APIs.');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests }; 