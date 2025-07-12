#!/usr/bin/env node

/**
 * OnStarJS2 Function Discovery Script
 * 
 * This script discovers and lists all available functions in the OnStarJS2 library
 * Run with: node mytests/discover_functions.js
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

function categorizeFunction(name) {
    const categories = {
        'Authentication & Account': ['getAccountVehicles', 'authenticate', 'login', 'logout', 'refresh'],
        'Vehicle Information': ['diagnostics', 'getVehicleInfo', 'getVehicleStatus', 'getVehicleData'],
        'Location Services': ['location', 'locate', 'getLocation', 'getPosition'],
        'Remote Commands': ['lock', 'unlock', 'start', 'stop', 'cancel', 'alert', 'horn', 'lights'],
        'Charging (EV)': ['charge', 'charging', 'battery', 'plug', 'schedule'],
        'Security': ['pin', 'security', 'access'],
        'Utility': ['create', 'destroy', 'init', 'setup', 'config'],
        'Internal/Private': ['_', 'internal', 'private']
    };

    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (name.toLowerCase().includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    return 'Other';
}

async function discoverFunctions() {
    console.log('🔍 OnStarJS2 Function Discovery');
    console.log('================================\n');
    
    try {
        // Create OnStar instance
        console.log('1. Creating OnStar instance...');
        const onstar = OnStar.create(config);
        console.log('✅ OnStar instance created successfully\n');
        
        // Get all methods from the prototype
        console.log('2. Discovering available functions...');
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(onstar));
        const functions = methods.filter(method => typeof onstar[method] === 'function');
        
        console.log(`📊 Found ${functions.length} functions total\n`);
        
        // Categorize functions
        const categorized = {};
        functions.forEach(func => {
            const category = categorizeFunction(func);
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(func);
        });
        
        // Display categorized functions
        console.log('3. Categorized Functions:');
        console.log('=========================\n');
        
        Object.entries(categorized).forEach(([category, funcs]) => {
            console.log(`📁 ${category} (${funcs.length} functions):`);
            funcs.sort().forEach(func => {
                console.log(`   • ${func}`);
            });
            console.log('');
        });
        
        // Test authentication to get more context
        console.log('4. Testing authentication for additional context...');
        try {
            await onstar.getAccountVehicles();
            console.log('✅ Authentication successful - all functions should be available\n');
        } catch (error) {
            console.log('⚠️ Authentication failed, but function discovery is still valid\n');
        }
        
        // Show function signatures (basic info)
        console.log('5. Function Details:');
        console.log('====================\n');
        
        const functionDetails = {
            'getAccountVehicles': 'Get list of vehicles in account',
            'diagnostics': 'Get vehicle diagnostic data',
            'location': 'Get vehicle location/GPS coordinates',
            'lockVehicle': 'Lock vehicle doors',
            'unlockVehicle': 'Unlock vehicle doors',
            'startVehicle': 'Start vehicle remotely',
            'cancelStartVehicle': 'Cancel remote start',
            'lockTrunk': 'Lock vehicle trunk',
            'unlockTrunk': 'Unlock vehicle trunk',
            'alertMyVehicle': 'Alert vehicle (horn/lights)',
            'cancelAlert': 'Cancel vehicle alert',
            'chargeOverride': 'Override charging settings (EV)',
            'getChargingProfile': 'Get current charging profile',
            'setChargingProfile': 'Set charging profile'
        };
        
        functions.forEach(func => {
            const description = functionDetails[func] || 'Function available in OnStarJS2';
            console.log(`🔧 ${func}: ${description}`);
        });
        
        // Show Node-RED node types for comparison
        console.log('\n6. Node-RED Node Types (for reference):');
        console.log('========================================\n');
        
        const nodeRedNodes = [
            'get-account-vehicles',
            'get-diagnostics', 
            'lock-myvehicle',
            'unlock-myvehicle',
            'lock-mytrunk',
            'unlock-mytrunk',
            'start-myvehicle',
            'cancel-start-myvehicle',
            'alert-myvehicle',
            'alert-myvehicle-lights',
            'alert-myvehicle-horn',
            'cancel-alert-myvehicle',
            'locate-vehicle',
            'mycharge-override',
            'get-mycharge-profile',
            'set-mycharge-profile'
        ];
        
        nodeRedNodes.forEach(node => {
            console.log(`📦 ${node}`);
        });
        
        console.log('\n7. Summary:');
        console.log('===========\n');
        console.log(`✅ Total OnStarJS2 functions: ${functions.length}`);
        console.log(`📦 Total Node-RED nodes: ${nodeRedNodes.length}`);
        console.log(`🔧 Functions available for direct API use`);
        console.log(`📋 Node-RED nodes available for visual programming`);
        
    } catch (error) {
        console.error('❌ Function discovery failed:', error.message);
    }
}

discoverFunctions().catch(console.error); 