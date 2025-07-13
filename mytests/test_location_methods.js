#!/usr/bin/env node

/**
 * Test script to check available location methods in OnStarJS2
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

async function testLocationMethods() {
    console.log('🔍 Testing OnStarJS2 Location Methods');
    console.log('=====================================\n');
    
    try {
        const onstar = OnStar.create(config);
        
        // Test authentication first
        console.log('1. Testing authentication...');
        await onstar.getAccountVehicles();
        console.log('✅ Authentication successful\n');
        
        // Check available methods
        console.log('2. Available OnStar methods:');
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(onstar));
        const locationMethods = methods.filter(method => 
            method.toLowerCase().includes('location') || 
            method.toLowerCase().includes('locate') ||
            method.toLowerCase().includes('position') ||
            method.toLowerCase().includes('gps')
        );
        
        console.log('Location-related methods found:');
        if (locationMethods.length > 0) {
            locationMethods.forEach(method => console.log(`   - ${method}`));
        } else {
            console.log('   No location methods found');
        }
        
        console.log('\nAll available methods:');
        methods.forEach(method => console.log(`   - ${method}`));
        
        // Try different possible location method names
        console.log('\n3. Testing possible location methods:');
        
        const possibleMethods = [
            'locateVehicle',
            'getVehicleLocation',
            'getLocation',
            'locate',
            'getPosition',
            'getGPSLocation'
        ];
        
        for (const methodName of possibleMethods) {
            if (typeof onstar[methodName] === 'function') {
                console.log(`✅ Found method: ${methodName}`);
                try {
                    console.log(`   Testing ${methodName}...`);
                    const result = await onstar[methodName]();
                    console.log(`   ✅ ${methodName} worked!`);
                    console.log(`   Result:`, JSON.stringify(result, null, 2));
                    break;
                } catch (error) {
                    console.log(`   ❌ ${methodName} failed: ${error.message}`);
                }
            } else {
                console.log(`❌ Method not found: ${methodName}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLocationMethods().catch(console.error); 