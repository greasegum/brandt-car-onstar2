#!/usr/bin/env node

/**
 * Test script for the /help endpoint
 * Verifies that the help endpoint returns correct command information
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'brandt-car-boltaire-2025';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

async function testHelpEndpoint() {
    console.log('🧪 Testing /help endpoint\n');

    try {
        // Test help endpoint
        const response = await axios.get(`${API_BASE}/help`, { headers });
        
        if (response.status === 200) {
            console.log('✅ Help endpoint accessible');
            
            const data = response.data.data;
            
            // Check structure
            console.log('\n📋 Response Structure:');
            console.log(`✅ Vehicle Info: ${data.vehicle_info ? 'Present' : 'Missing'}`);
            console.log(`✅ API Info: ${data.api_info ? 'Present' : 'Missing'}`);
            console.log(`✅ Safety Summary: ${data.safety_summary ? 'Present' : 'Missing'}`);
            console.log(`✅ Commands Array: ${Array.isArray(data.commands) ? 'Present' : 'Missing'}`);
            console.log(`✅ Safety Notes: ${Array.isArray(data.safety_notes) ? 'Present' : 'Missing'}`);
            console.log(`✅ Bot Integration Tips: ${Array.isArray(data.bot_integration_tips) ? 'Present' : 'Missing'}`);
            
            // Check safety summary
            console.log('\n🛡️ Safety Summary:');
            console.log(`   Total Commands: ${data.safety_summary.total_commands}`);
            console.log(`   Enabled Commands: ${data.safety_summary.enabled_commands}`);
            console.log(`   Disabled Commands: ${data.safety_summary.disabled_commands}`);
            console.log(`   Safe Commands: ${data.safety_summary.safe_commands}`);
            console.log(`   Medium Risk Commands: ${data.safety_summary.medium_risk_commands}`);
            console.log(`   High Risk Commands: ${data.safety_summary.high_risk_commands}`);
            console.log(`   Confirmation Required: ${data.safety_summary.confirmation_required}`);
            console.log(`   Alert Status: ${data.safety_summary.alert_endpoints_status}`);
            
            // Check commands
            console.log('\n📝 Available Commands:');
            data.commands.forEach(cmd => {
                const status = cmd.enabled ? '✅' : '❌';
                const risk = cmd.safety_level === 'safe' ? '🟢' : 
                           cmd.safety_level === 'medium' ? '🟡' : '🔴';
                const confirm = cmd.requires_confirmation ? '🔐' : '  ';
                
                console.log(`   ${status} ${risk} ${confirm} ${cmd.command} - ${cmd.description}`);
                
                if (!cmd.enabled && cmd.disabled_reason) {
                    console.log(`      └── Disabled: ${cmd.disabled_reason}`);
                }
                
                if (cmd.warning) {
                    console.log(`      └── ⚠️  ${cmd.warning}`);
                }
            });
            
            // Check specific commands
            console.log('\n🔍 Specific Command Checks:');
            
            const flashLights = data.commands.find(cmd => cmd.command === 'flash_lights');
            if (flashLights) {
                console.log(`   Flash Lights: ${flashLights.enabled ? 'ENABLED ⚠️' : 'DISABLED ✅'}`);
            }
            
            const honkHorn = data.commands.find(cmd => cmd.command === 'honk_horn');
            if (honkHorn) {
                console.log(`   Honk Horn: ${honkHorn.enabled ? 'ENABLED ⚠️' : 'DISABLED ✅'}`);
            }
            
            const getStatus = data.commands.find(cmd => cmd.command === 'get_status');
            if (getStatus) {
                console.log(`   Get Status: ${getStatus.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
            }
            
            const lockDoors = data.commands.find(cmd => cmd.command === 'lock_doors');
            if (lockDoors) {
                console.log(`   Lock Doors: ${lockDoors.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
            }
            
            // Check bot integration tips
            console.log('\n🤖 Bot Integration Tips:');
            data.bot_integration_tips.forEach(tip => {
                console.log(`   • ${tip}`);
            });
            
            // Check safety notes
            console.log('\n🔒 Safety Notes:');
            data.safety_notes.forEach(note => {
                console.log(`   • ${note}`);
            });
            
            console.log('\n✅ Help endpoint test completed successfully!');
            
        } else {
            console.log('❌ Help endpoint returned unexpected status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Error testing help endpoint:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
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
    await testHelpEndpoint();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testHelpEndpoint }; 