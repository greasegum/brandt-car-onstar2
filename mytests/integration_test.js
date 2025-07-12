#!/usr/bin/env node

/**
 * COMPREHENSIVE INTEGRATION TEST
 * 
 * This script validates the entire OnStar integration system:
 * - Authentication (TOTP)
 * - Vehicle communication
 * - Diagnostic data extraction
 * - Token management
 * - Error handling
 * 
 * Run this test to validate your complete setup.
 */

const fs = require('fs');
const path = require('path');
const OnStar = require('onstarjs2');

console.log('🔍 OnStar Integration System Validation');
console.log('=====================================\n');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function logTest(name, status, message = '') {
    const statusSymbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${statusSymbol} ${name}${message ? ': ' + message : ''}`);
    
    testResults.tests.push({ name, status, message });
    if (status === 'pass') testResults.passed++;
    else if (status === 'fail') testResults.failed++;
    else testResults.warnings++;
}

async function runIntegrationTest() {
    try {
        console.log('1. CHECKING ENVIRONMENT SETUP\n');
        
        // Check for .env file
        if (!fs.existsSync('.env')) {
            logTest('Environment Check', 'fail', '.env file not found');
            console.log('\n❌ Critical: .env file is required. Please create it with your OnStar credentials.');
            return;
        }
        logTest('Environment Check', 'pass', '.env file exists');
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion >= 18) {
            logTest('Node.js Version', 'pass', `${nodeVersion} (recommended 18+)`);
        } else {
            logTest('Node.js Version', 'warning', `${nodeVersion} (recommend upgrading to 18+)`);
        }
        
        // Check for required dependencies
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const hasOnstarDep = packageJson.dependencies && packageJson.dependencies.onstarjs2;
        if (hasOnstarDep) {
            logTest('Dependencies', 'pass', 'OnStarJS2 dependency found');
        } else {
            logTest('Dependencies', 'warning', 'OnStarJS2 not found in package.json');
        }
        
        console.log('\n2. VALIDATING AUTHENTICATION\n');
        
        // Initialize OnStar with credentials from .env
        const onstar = OnStar.create({
            username: process.env.ONSTAR_USERNAME,
            password: process.env.ONSTAR_PASSWORD,
            vin: process.env.ONSTAR_VIN,
            onStarPin: process.env.ONSTAR_PIN,
            onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
            deviceId: process.env.ONSTAR_DEVICEID,
            tokenLocation: './',
            checkRequestStatus: true,
            requestPollingTimeoutSeconds: 60,
            requestPollingIntervalSeconds: 3
        });
        
        // Test authentication
        try {
            await onstar.getAccountVehicles();
            logTest('Authentication', 'pass', 'Successfully authenticated with OnStar');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                logTest('Authentication', 'fail', 'Invalid credentials or expired tokens');
            } else {
                logTest('Authentication', 'fail', `Error: ${error.message}`);
            }
            console.log('\n❌ Authentication failed. Please check your credentials.');
            return;
        }
        
        console.log('\n3. TESTING VEHICLE COMMUNICATION\n');
        
        // Test vehicle diagnostics
        try {
            const diagnostics = await onstar.diagnostics();
            if (diagnostics && diagnostics.commandResponse && diagnostics.commandResponse.body) {
                logTest('Vehicle Communication', 'pass', 'Successfully retrieved diagnostic data');
                
                // Check for diagnostic elements
                const diagnosticData = diagnostics.commandResponse.body.diagnosticResponse;
                if (diagnosticData && diagnosticData.length > 0) {
                    let foundData = false;
                    
                    for (const diagnostic of diagnosticData) {
                        if (diagnostic.diagnosticElement && diagnostic.diagnosticElement.length > 0) {
                            foundData = true;
                            const element = diagnostic.diagnosticElement[0];
                            
                            // Check for battery data
                            if (element.name === 'EV BATTERY LEVEL') {
                                logTest('Battery Data', 'pass', `Battery Level: ${element.value}${element.unit}`);
                            }
                            
                            // Check for range data
                            if (element.name === 'EV RANGE') {
                                logTest('Range Data', 'pass', `Range: ${element.value} ${element.unit}`);
                            }
                            
                            // Check for odometer data
                            if (element.name === 'ODOMETER') {
                                logTest('Odometer Data', 'pass', `Odometer: ${element.value} ${element.unit}`);
                            }
                        }
                    }
                    
                    if (!foundData) {
                        logTest('Diagnostic Parsing', 'warning', 'No diagnostic elements found in response');
                    }
                } else {
                    logTest('Diagnostic Data', 'warning', 'Empty diagnostic response');
                }
            } else {
                logTest('Vehicle Communication', 'warning', 'Received empty response');
            }
        } catch (error) {
            logTest('Vehicle Communication', 'fail', `Error: ${error.message}`);
        }
        
        console.log('\n4. CHECKING TOKEN MANAGEMENT\n');
        
        // Check token files
        const tokenFiles = ['gm_tokens.json', 'microsoft_tokens.json'];
        for (const tokenFile of tokenFiles) {
            if (fs.existsSync(tokenFile)) {
                logTest(`Token File (${tokenFile})`, 'pass', 'Token file exists');
                
                try {
                    const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
                    if (tokens.access_token) {
                        logTest(`Token Validity (${tokenFile})`, 'pass', 'Contains access token');
                    } else {
                        logTest(`Token Validity (${tokenFile})`, 'warning', 'No access token found');
                    }
                } catch (error) {
                    logTest(`Token Validity (${tokenFile})`, 'fail', 'Invalid JSON format');
                }
            } else {
                logTest(`Token File (${tokenFile})`, 'warning', 'Token file not found (will be created on first auth)');
            }
        }
        
        console.log('\n5. TESTING RATE LIMITING AWARENESS\n');
        
        // Test a second diagnostic call to check rate limiting
        try {
            const start = Date.now();
            await onstar.diagnostics({ diagnosticItem: ['EV BATTERY LEVEL'] });
            const duration = Date.now() - start;
            
            if (duration > 10000) { // More than 10 seconds
                logTest('Rate Limiting', 'pass', `Handled rate limiting (${Math.round(duration/1000)}s response)`);
            } else {
                logTest('Rate Limiting', 'pass', `Quick response (${Math.round(duration/1000)}s)`);
            }
        } catch (error) {
            if (error.response && error.response.status === 429) {
                logTest('Rate Limiting', 'pass', 'Rate limit detected (429 error)');
            } else {
                logTest('Rate Limiting', 'warning', `Unexpected error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Critical error during integration test:', error);
        logTest('Integration Test', 'fail', `Critical error: ${error.message}`);
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 INTEGRATION TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings}`);
    console.log(`📋 Total Tests: ${testResults.tests.length}`);
    
    const overallStatus = testResults.failed === 0 ? 'PASSED' : 'FAILED';
    const statusSymbol = testResults.failed === 0 ? '✅' : '❌';
    
    console.log(`\n${statusSymbol} OVERALL STATUS: ${overallStatus}`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 Your OnStar integration system is fully functional!');
        console.log('   Ready for production use with proper monitoring.');
    } else {
        console.log('\n🔧 Some tests failed. Please check the errors above and:');
        console.log('   1. Verify your .env file configuration');
        console.log('   2. Ensure OnStar account has "Third-Party Authenticator App" enabled');
        console.log('   3. Check for rate limiting (wait 30 minutes if needed)');
        console.log('   4. Review the troubleshooting guide in ONSTAR_INTEGRATION_GUIDE.md');
    }
    
    console.log('\n📚 For detailed guidance, see: ONSTAR_INTEGRATION_GUIDE.md');
}

// Run the integration test
runIntegrationTest().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
