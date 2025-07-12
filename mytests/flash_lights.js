#!/usr/bin/env node

/**
 * Flash Vehicle Lights Script
 * 
 * This script flashes the vehicle lights using OnStar's alert function
 * Run with: node mytests/flash_lights.js
 */

const OnStar = require('onstarjs2');
require('dotenv').config();

const config = {
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
};

async function flashLights() {
    console.log('💡 Vehicle Light Flash Script');
    console.log('=============================\n');
    
    try {
        // Create OnStar instance
        console.log('1. Initializing OnStar connection...');
        const onstar = OnStar.create(config);
        
        // Test authentication
        console.log('2. Testing authentication...');
        await onstar.getAccountVehicles();
        console.log('✅ Authentication successful\n');
        
        // Flash lights
        console.log('3. Flashing vehicle lights...');
        console.log('   💡 Sending light flash command...');
        
        const result = await onstar.alert({
            lights: true,
            horn: false,
            delay: 0,
            duration: 1
        });
        
        if (result && result.response && result.response.data) {
            const status = result.response.data.commandResponse.status;
            console.log(`✅ Light flash command sent successfully!`);
            console.log(`   Status: ${status}`);
            
            if (status === 'success') {
                console.log('\n🎉 Vehicle lights should be flashing now!');
                console.log('   The lights will flash for a few seconds.');
            } else {
                console.log(`\n⚠️ Command sent but status is: ${status}`);
            }
            
            // Show full response for debugging
            console.log('\n📊 Full Response:');
            console.log(JSON.stringify(result.response.data, null, 2));
            
        } else {
            console.log('❌ No response data received');
        }
        
    } catch (error) {
        console.error('❌ Light flash failed:', error.message);
        
        if (error.response) {
            console.error('HTTP Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Handle command line arguments for customization
const args = process.argv.slice(2);
let customDuration = 1;
let customDelay = 0;

if (args.length > 0) {
    customDuration = parseInt(args[0]) || 1;
    console.log(`📝 Using custom duration: ${customDuration} seconds`);
}

if (args.length > 1) {
    customDelay = parseInt(args[1]) || 0;
    console.log(`📝 Using custom delay: ${customDelay} seconds`);
}

console.log(`\n🚗 Flash Lights Configuration:`);
console.log(`   Duration: ${customDuration} second(s)`);
console.log(`   Delay: ${customDelay} second(s)`);
console.log(`   Action: Flash lights only (no horn)\n`);

flashLights().catch(console.error); 