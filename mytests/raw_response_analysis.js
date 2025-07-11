#!/usr/bin/env node

/**
 * Raw Response Analysis Test
 * Examines the raw OnStar response data to understand the structure
 */

const OnStar = require('onstarjs2');
require('dotenv').config({ path: '.secrets' });

const config = {
    username: process.env.ONSTAR_USERNAME,
    password: process.env.ONSTAR_PASSWORD,
    vin: process.env.ONSTAR_VIN,
    onStarPin: process.env.ONSTAR_PIN,
    onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
    deviceId: process.env.ONSTAR_DEVICEID,
    tokenLocation: './tokens/',
    checkRequestStatus: true,
    requestPollingTimeoutSeconds: 60,
    requestPollingIntervalSeconds: 10
};

function deepInspect(obj, name = 'object', maxDepth = 5, currentDepth = 0) {
    if (currentDepth >= maxDepth) return;
    
    console.log(`${'  '.repeat(currentDepth)}📁 ${name}: ${typeof obj}`);
    
    if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            console.log(`${'  '.repeat(currentDepth)}📋 Array with ${obj.length} items`);
            obj.forEach((item, index) => {
                if (index < 5) { // Only show first 5 items
                    deepInspect(item, `[${index}]`, maxDepth, currentDepth + 1);
                }
            });
        } else {
            const keys = Object.keys(obj);
            console.log(`${'  '.repeat(currentDepth)}🔑 Object with keys: ${keys.join(', ')}`);
            
            keys.forEach(key => {
                const value = obj[key];
                if (value !== null && value !== undefined) {
                    if (typeof value === 'object') {
                        deepInspect(value, key, maxDepth, currentDepth + 1);
                    } else {
                        console.log(`${'  '.repeat(currentDepth + 1)}📄 ${key}: ${value} (${typeof value})`);
                    }
                } else {
                    console.log(`${'  '.repeat(currentDepth + 1)}❌ ${key}: ${value}`);
                }
            });
        }
    } else {
        console.log(`${'  '.repeat(currentDepth)}📄 Value: ${obj}`);
    }
}

async function analyzeRawResponse() {
    console.log('🔍 Raw OnStar Response Analysis');
    console.log('===============================');
    
    const onStar = OnStar.create(config);

    try {
        console.log('1. Getting raw diagnostic response...');
        const result = await onStar.diagnostics({
            diagnosticItem: ["EV BATTERY LEVEL", "ODOMETER", "VEHICLE RANGE"]
        });

        console.log('\n📊 Complete Raw Response Structure:');
        console.log('=====================================');
        deepInspect(result, 'diagnosticsResult');

        console.log('\n🔍 Analyzing Response Path:');
        console.log('==========================');
        
        // Check different possible paths in the response
        const paths = [
            'response',
            'response.data',
            'response.data.commandResponse',
            'response.data.commandResponse.body',
            'response.data.commandResponse.body.diagnosticResponse',
            'response.data.commandResponse.body.diagnosticResponse[0]'
        ];

        paths.forEach(path => {
            try {
                const pathParts = path.split('.');
                let current = result;
                
                for (const part of pathParts) {
                    if (part.includes('[')) {
                        const arrayPart = part.split('[')[0];
                        const index = parseInt(part.split('[')[1].split(']')[0]);
                        current = current[arrayPart][index];
                    } else {
                        current = current[part];
                    }
                }
                
                console.log(`✅ ${path}:`, current);
            } catch (e) {
                console.log(`❌ ${path}: Not found`);
            }
        });

        console.log('\n📋 Diagnostic Items Details:');
        console.log('============================');
        
        // Try to find diagnostic data in different locations
        const diagnosticData = result?.response?.data?.commandResponse?.body?.diagnosticResponse;
        if (diagnosticData && Array.isArray(diagnosticData)) {
            diagnosticData.forEach((item, index) => {
                console.log(`\n🔍 Diagnostic Item ${index + 1}:`);
                console.log(`   Name: ${item.name}`);
                console.log(`   Value: ${item.value} (type: ${typeof item.value})`);
                console.log(`   Unit: ${item.unit}`);
                console.log(`   Raw item:`, JSON.stringify(item, null, 2));
            });
        } else {
            console.log('❌ No diagnostic data found in expected location');
        }

        console.log('\n🔍 Checking for Vehicle State Information:');
        console.log('=========================================');
        
        // Look for any indication of vehicle state
        const searchForVehicleState = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return;
            
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'string' && (
                    value.toLowerCase().includes('sleep') ||
                    value.toLowerCase().includes('hibernat') ||
                    value.toLowerCase().includes('awake') ||
                    value.toLowerCase().includes('active') ||
                    value.toLowerCase().includes('available')
                )) {
                    console.log(`🔍 Found vehicle state indicator: ${currentPath} = ${value}`);
                }
                
                if (typeof value === 'object') {
                    searchForVehicleState(value, currentPath);
                }
            });
        };
        
        searchForVehicleState(result);

        console.log('\n📊 JSON Export for Analysis:');
        console.log('============================');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        if (error.response) {
            console.error('HTTP Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

analyzeRawResponse().catch(console.error);
