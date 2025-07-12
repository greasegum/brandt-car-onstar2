#!/usr/bin/env node

/**
 * Test script for the API configuration system
 * Tests endpoint enabling/disabling and confirmation requirements
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'brandt-car-boltaire-2025';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

async function testEndpoint(method, endpoint, data = {}) {
    try {
        const response = await axios({
            method,
            url: `${API_BASE}${endpoint}`,
            headers,
            data
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            status: error.response?.status,
            data: error.response?.data 
        };
    }
}

async function runTests() {
    console.log('🧪 Testing API Configuration System\n');

    // Test 1: Try disabled endpoint (alert/lights)
    console.log('Test 1: Trying disabled endpoint /alert/lights');
    const disabledTest = await testEndpoint('POST', '/alert/lights', { duration_seconds: 5 });
    
    if (!disabledTest.success && disabledTest.status === 403) {
        console.log('✅ PASS: Disabled endpoint correctly blocked');
        console.log(`   Message: ${disabledTest.data.message}`);
    } else {
        console.log('❌ FAIL: Disabled endpoint was not blocked');
    }
    console.log();

    // Test 2: Try endpoint requiring confirmation without confirmation
    console.log('Test 2: Trying endpoint requiring confirmation without confirm=true');
    const confirmTest1 = await testEndpoint('POST', '/doors/unlock', {});
    
    if (!confirmTest1.success && confirmTest1.status === 400) {
        console.log('✅ PASS: Confirmation requirement enforced');
        console.log(`   Message: ${confirmTest1.data.message}`);
    } else {
        console.log('❌ FAIL: Confirmation requirement not enforced');
    }
    console.log();

    // Test 3: Try endpoint requiring confirmation with confirmation
    console.log('Test 3: Trying endpoint requiring confirmation with confirm=true');
    const confirmTest2 = await testEndpoint('POST', '/doors/unlock', { confirm: true });
    
    if (confirmTest2.success || (confirmTest2.status >= 500)) {
        console.log('✅ PASS: Confirmation accepted (or OnStar error, which is expected)');
        if (confirmTest2.success) {
            console.log(`   Status: ${confirmTest2.data.message}`);
        } else {
            console.log(`   OnStar Error: ${confirmTest2.data?.message || 'Connection issue'}`);
        }
    } else {
        console.log('❌ FAIL: Confirmation not accepted');
    }
    console.log();

    // Test 4: Try enabled endpoint without confirmation requirement
    console.log('Test 4: Trying enabled endpoint without confirmation requirement');
    const enabledTest = await testEndpoint('GET', '/status');
    
    if (enabledTest.success || (enabledTest.status >= 500)) {
        console.log('✅ PASS: Enabled endpoint accessible (or OnStar error, which is expected)');
        if (enabledTest.success) {
            console.log(`   Status: Vehicle data retrieved`);
        } else {
            console.log(`   OnStar Error: ${enabledTest.data?.message || 'Connection issue'}`);
        }
    } else {
        console.log('❌ FAIL: Enabled endpoint not accessible');
    }
    console.log();

    // Test 5: Check capabilities endpoint shows configuration
    console.log('Test 5: Checking capabilities endpoint shows configuration');
    const capabilitiesTest = await testEndpoint('GET', '/capabilities');
    
    if (capabilitiesTest.success && capabilitiesTest.data.data.configuration) {
        console.log('✅ PASS: Configuration visible in capabilities');
        console.log(`   Alert lights enabled: ${capabilitiesTest.data.data.configuration.endpoints_enabled.alert.lights}`);
        console.log(`   Confirmation required for doors_unlock: ${capabilitiesTest.data.data.configuration.security_settings.confirmation_required.doors_unlock}`);
    } else {
        console.log('❌ FAIL: Configuration not visible in capabilities');
    }
    console.log();

    // Test 6: Test configuration reload
    console.log('Test 6: Testing configuration reload');
    const reloadTest = await testEndpoint('POST', '/config/reload');
    
    if (reloadTest.success) {
        console.log('✅ PASS: Configuration reload successful');
        console.log(`   Timestamp: ${reloadTest.data.data.timestamp}`);
    } else {
        console.log('❌ FAIL: Configuration reload failed');
        console.log(`   Error: ${reloadTest.data?.message || 'Unknown error'}`);
    }
    console.log();

    console.log('🏁 Configuration system tests completed!');
    console.log('\n📋 Summary:');
    console.log('- Alert endpoints are disabled by default for safety');
    console.log('- Door unlock requires confirmation');
    console.log('- Status and diagnostic endpoints are freely accessible');
    console.log('- Configuration can be reloaded without restart');
    console.log('\n💡 To enable alert endpoints, edit config.json and set alert.lights to true');
}

// Check if server is running
async function checkServer() {
    try {
        const response = await axios.get(`${API_BASE}/health`);
        return true;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔍 Checking if server is running...');
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   node server.js');
        process.exit(1);
    }
    
    console.log('✅ Server is running\n');
    await runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testEndpoint, runTests }; 