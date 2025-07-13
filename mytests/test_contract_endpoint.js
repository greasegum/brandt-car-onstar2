#!/usr/bin/env node

/**
 * Test script for the /contract endpoint and environment status checking
 * Verifies Railway environment detection and API contract generation
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'brandt-car-boltaire-2025';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

async function testContractEndpoint() {
    console.log('🧪 Testing /contract endpoint\n');

    try {
        // Test contract endpoint
        const response = await axios.get(`${API_BASE}/contract`, { headers });
        
        if (response.status === 200) {
            console.log('✅ Contract endpoint accessible');
            
            const data = response.data.data;
            
            // Check contract structure
            console.log('\n📋 Contract Structure:');
            console.log(`✅ Contract Version: ${data.contract_version}`);
            console.log(`✅ API Version: ${data.api_version}`);
            console.log(`✅ Generated At: ${data.generated_at}`);
            
            // Check deployment info
            console.log('\n🚀 Deployment Info:');
            console.log(`   Platform: ${data.deployment.platform}`);
            console.log(`   Environment: ${data.deployment.environment}`);
            console.log(`   Status: ${data.deployment.status}`);
            console.log(`   Config Source: ${data.deployment.configuration_source}`);
            
            // Check authentication contract
            console.log('\n🔐 Authentication Contract:');
            console.log(`   Type: ${data.authentication.type}`);
            console.log(`   Header: ${data.authentication.header}`);
            console.log(`   Format: ${data.authentication.format}`);
            console.log(`   API Key Source: ${data.authentication.api_key_source}`);
            
            // Check rate limits
            console.log('\n⏱️ Rate Limits:');
            console.log(`   Global: ${data.rate_limits.global.max_requests} requests per ${data.rate_limits.global.window_minutes} minutes`);
            console.log(`   Alert Commands: ${data.rate_limits.alert_commands.max_requests} requests per ${data.rate_limits.alert_commands.window_minutes} minutes`);
            console.log(`   Door Commands: ${data.rate_limits.door_commands.max_requests} requests per ${data.rate_limits.door_commands.window_minutes} minutes`);
            
            // Check command categories
            console.log('\n📂 Command Categories:');
            Object.entries(data.command_categories).forEach(([category, info]) => {
                console.log(`   ${category}:`);
                console.log(`     Safety Level: ${info.safety_level}`);
                console.log(`     Auth Required: ${info.authentication_required}`);
                console.log(`     Confirmation: ${info.confirmation_required}`);
                console.log(`     Commands: ${info.commands.join(', ')}`);
            });
            
            // Check safety contract
            console.log('\n🛡️ Safety Contract:');
            Object.entries(data.safety_contract.safety_levels).forEach(([level, info]) => {
                console.log(`   ${level}:`);
                console.log(`     Description: ${info.description}`);
                console.log(`     Auto Execute: ${info.auto_execute}`);
                console.log(`     User Confirmation: ${info.user_confirmation}`);
                if (info.examples) {
                    console.log(`     Examples: ${info.examples.join(', ')}`);
                }
            });
            
            // Check bot integration guidance
            console.log('\n🤖 Bot Integration:');
            console.log('   Recommended Flow:');
            data.bot_integration.recommended_flow.forEach((step, index) => {
                console.log(`     ${step}`);
            });
            
            console.log('\n   Safety Recommendations:');
            data.bot_integration.safety_recommendations.forEach(rec => {
                console.log(`     • ${rec}`);
            });
            
            // Check SLA
            console.log('\n📊 Service Level Agreement:');
            console.log(`   Availability: ${data.sla.availability}`);
            console.log(`   Response Time: ${data.sla.response_time}`);
            console.log(`   Vehicle Wake Time: ${data.sla.vehicle_wake_time}`);
            
            console.log('\n✅ Contract endpoint test completed successfully!');
            
        } else {
            console.log('❌ Contract endpoint returned unexpected status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Error testing contract endpoint:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

async function testEnvironmentStatus() {
    console.log('🌍 Testing environment status in /help endpoint\n');

    try {
        // Test help endpoint for environment status
        const response = await axios.get(`${API_BASE}/help`, { headers });
        
        if (response.status === 200) {
            console.log('✅ Help endpoint accessible');
            
            const envStatus = response.data.data.environment_status;
            
            if (envStatus) {
                console.log('\n🚀 Environment Status:');
                console.log(`   Platform: ${envStatus.deployment_info.platform}`);
                console.log(`   Environment: ${envStatus.deployment_info.environment}`);
                console.log(`   Overall Status: ${envStatus.overall_status}`);
                console.log(`   Status Message: ${envStatus.status_message}`);
                
                // Check deployment info
                console.log('\n📋 Deployment Info:');
                console.log(`   Project ID: ${envStatus.deployment_info.project_id}`);
                console.log(`   Service ID: ${envStatus.deployment_info.service_id}`);
                console.log(`   Deployment ID: ${envStatus.deployment_info.deployment_id}`);
                console.log(`   Replica ID: ${envStatus.deployment_info.replica_id}`);
                
                // Check git info
                console.log('\n🔗 Git Info:');
                console.log(`   Branch: ${envStatus.deployment_info.git_info.branch}`);
                console.log(`   Commit: ${envStatus.deployment_info.git_info.commit}`);
                console.log(`   Repo: ${envStatus.deployment_info.git_info.owner}/${envStatus.deployment_info.git_info.repo}`);
                
                // Check required variables
                console.log('\n🔑 Required Variables:');
                Object.entries(envStatus.required_variables).forEach(([varName, info]) => {
                    const status = info.configured ? '✅' : '❌';
                    const value = info.configured ? info.masked_value : 'NOT SET';
                    console.log(`   ${status} ${varName}: ${value}`);
                });
                
                // Check optional variables
                console.log('\n⚙️ Optional Variables:');
                Object.entries(envStatus.optional_variables).forEach(([varName, info]) => {
                    const status = info.configured ? '✅' : '⚠️';
                    const value = info.configured ? info.masked_value : 'DEFAULT';
                    console.log(`   ${status} ${varName}: ${value}`);
                });
                
                // Check Railway variables
                console.log('\n🚂 Railway Variables:');
                Object.entries(envStatus.railway_variables).forEach(([varName, info]) => {
                    const status = info.configured ? '✅' : '❌';
                    const value = info.configured ? info.value : 'NOT SET';
                    console.log(`   ${status} ${varName}: ${value}`);
                });
                
                // Check configuration overrides
                console.log('\n🔧 Configuration Overrides:');
                console.log(`   Active Overrides: ${envStatus.configuration_overrides.active_overrides}`);
                if (envStatus.configuration_overrides.active_overrides > 0) {
                    Object.entries(envStatus.configuration_overrides.overrides).forEach(([varName, info]) => {
                        console.log(`   ✅ ${varName}: ${info.value} (parsed: ${info.parsed})`);
                    });
                } else {
                    console.log('   No environment variable overrides active');
                }
                
                console.log('\n✅ Environment status test completed successfully!');
                
            } else {
                console.log('❌ Environment status not found in help response');
            }
            
        } else {
            console.log('❌ Help endpoint returned unexpected status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Error testing environment status:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

async function testBotIntegrationScenario() {
    console.log('🤖 Testing bot integration scenario\n');

    try {
        // Step 1: Get contract
        console.log('Step 1: Getting API contract...');
        const contractResponse = await axios.get(`${API_BASE}/contract`);
        const contract = contractResponse.data.data;
        
        console.log(`✅ Contract loaded (v${contract.contract_version})`);
        console.log(`   Platform: ${contract.deployment.platform}`);
        console.log(`   Environment: ${contract.deployment.environment}`);
        
        // Step 2: Get available commands
        console.log('\nStep 2: Getting available commands...');
        const helpResponse = await axios.get(`${API_BASE}/help`);
        const commands = helpResponse.data.data.commands;
        
        console.log(`✅ Commands loaded (${commands.length} total)`);
        
        // Step 3: Analyze commands by safety level
        console.log('\nStep 3: Analyzing commands by safety level...');
        const safeCommands = commands.filter(cmd => cmd.enabled && cmd.safety_level === 'safe');
        const mediumCommands = commands.filter(cmd => cmd.enabled && cmd.safety_level === 'medium');
        const highRiskCommands = commands.filter(cmd => cmd.safety_level === 'high_risk');
        
        console.log(`   Safe commands: ${safeCommands.length}`);
        console.log(`   Medium risk commands: ${mediumCommands.length}`);
        console.log(`   High risk commands: ${highRiskCommands.length} (${highRiskCommands.filter(cmd => cmd.enabled).length} enabled)`);
        
        // Step 4: Test bot decision making
        console.log('\nStep 4: Testing bot decision making...');
        
        const testCommands = ['get_status', 'unlock_doors', 'flash_lights', 'nonexistent_command'];
        
        testCommands.forEach(cmdName => {
            const command = commands.find(cmd => cmd.command === cmdName);
            
            console.log(`\n   Testing: ${cmdName}`);
            
            if (!command) {
                console.log('     ❌ Command not found');
                return;
            }
            
            if (!command.enabled) {
                console.log(`     ❌ Command disabled: ${command.disabled_reason}`);
                return;
            }
            
            if (command.safety_level === 'high_risk') {
                console.log(`     ⚠️  High risk command - requires explicit user permission`);
                console.log(`     Warning: ${command.warning}`);
                return;
            }
            
            if (command.requires_confirmation) {
                console.log(`     🔐 Requires confirmation parameter`);
                console.log(`     Bot should add: {"confirm": true}`);
            }
            
            console.log(`     ✅ Safe to execute (${command.safety_level})`);
        });
        
        console.log('\n✅ Bot integration scenario test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error in bot integration scenario:', error.message);
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
    
    await testContractEndpoint();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testEnvironmentStatus();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testBotIntegrationScenario();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testContractEndpoint, testEnvironmentStatus, testBotIntegrationScenario }; 