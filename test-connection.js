#!/usr/bin/env node

// Simple test script to verify OnStar connection
require('dotenv').config({ path: '.secrets' });
const OnStar = require('onstarjs2');

async function testConnection() {
    console.log('🚗 Testing OnStar Connection...\n');
    
    // Create OnStar client with your credentials from .secrets
    const options = {
        username: process.env.ONSTAR_USERNAME || process.env.GM_USERNAME,
        password: process.env.ONSTAR_PASSWORD || process.env.GM_PASSWORD,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        onStarPin: process.env.ONSTAR_PIN || process.env.GM_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        checkRequestStatus: true,
        requestPollingTimeoutSeconds: 60,
        requestPollingIntervalSeconds: 6
    };

    console.log('Configuration:');
    console.log(`- Username: ${options.username}`);
    console.log(`- VIN: ${options.vin}`);
    console.log(`- Device ID: ${options.deviceId}`);
    console.log(`- TOTP Secret: ${options.onStarTOTP ? '***configured***' : 'NOT SET'}`);
    console.log(`- PIN: ${options.onStarPin ? '***configured***' : 'NOT SET'}\n`);

    try {
        const client = OnStar.create(options);
        
        console.log('🔐 Testing authentication...');
        // Test basic connection by getting account vehicles
        const vehiclesResponse = await client.getAccountVehicles();
        
        if (vehiclesResponse && vehiclesResponse.response && vehiclesResponse.response.data) {
            console.log('✅ Successfully connected to OnStar!');
            console.log('📋 Account vehicles:', JSON.stringify(vehiclesResponse.response.data, null, 2));
            
            // Test getting vehicle status
            console.log('\n🔍 Testing vehicle diagnostics...');
            const diagnosticsResponse = await client.getDiagnostics({
                diagnosticItem: [
                    "EV BATTERY LEVEL",
                    "EV CHARGE STATE", 
                    "ODOMETER",
                    "LAST TRIP DISTANCE"
                ]
            });
            
            if (diagnosticsResponse && diagnosticsResponse.response) {
                console.log('✅ Diagnostics request successful!');
                console.log('📊 Diagnostics data:', JSON.stringify(diagnosticsResponse.response.data, null, 2));
            } else {
                console.log('⚠️ Diagnostics request returned no data');
            }
            
        } else {
            console.log('❌ Connection failed - no vehicle data returned');
            console.log('Response:', JSON.stringify(vehiclesResponse, null, 2));
        }
        
    } catch (error) {
        console.log('❌ Connection test failed!');
        console.error('Error details:', error.message);
        
        if (error.response) {
            console.error('HTTP Status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        // Common error interpretations
        if (error.message.includes('401')) {
            console.log('\n💡 Troubleshooting: 401 Unauthorized');
            console.log('- Check username/password are correct');
            console.log('- Verify TOTP secret is valid');
            console.log('- Try logging into myChevrolet app to verify credentials');
        } else if (error.message.includes('403')) {
            console.log('\n💡 Troubleshooting: 403 Forbidden');
            console.log('- Account may be locked or suspended');
            console.log('- Check if OnStar subscription is active');
        } else if (error.message.includes('429')) {
            console.log('\n💡 Troubleshooting: 429 Rate Limited');
            console.log('- OnStar is rate limiting requests');
            console.log('- Wait 30+ minutes before trying again');
        }
    }
}

// Check if .secrets file exists and has required vars
function checkEnvironment() {
    const required = ['ONSTAR_USERNAME', 'ONSTAR_PASSWORD', 'ONSTAR_VIN', 'ONSTAR_TOTP_SECRET'];
    const missing = required.filter(key => !process.env[key] && !process.env[key.replace('ONSTAR_', 'GM_')]);
    
    if (missing.length > 0) {
        console.log('❌ Missing required environment variables:');
        missing.forEach(key => console.log(`  - ${key}`));
        console.log('\nMake sure your .secrets file contains all required variables.');
        process.exit(1);
    }
}

// Run the test
checkEnvironment();
testConnection().catch(console.error);
