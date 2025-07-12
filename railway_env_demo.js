#!/usr/bin/env node

/**
 * Railway Environment Detection Demo
 * Shows how the API detects Railway deployment environment
 */

const axios = require('axios');

// Simulate Railway environment variables (for demo purposes)
const railwayEnvVars = {
    'RAILWAY_ENVIRONMENT': 'production',
    'RAILWAY_PROJECT_ID': 'abc123def456',
    'RAILWAY_SERVICE_ID': 'service-789',
    'RAILWAY_DEPLOYMENT_ID': 'deploy-xyz',
    'RAILWAY_REPLICA_ID': 'replica-001',
    'RAILWAY_GIT_COMMIT_SHA': 'a1b2c3d4e5f6',
    'RAILWAY_GIT_BRANCH': 'main',
    'RAILWAY_GIT_REPO_NAME': 'brandt-car-onstar2',
    'RAILWAY_GIT_REPO_OWNER': 'BrandtAI'
};

// Simulate configuration override variables
const configOverrides = {
    'CONFIG_ALERT_LIGHTS': 'false',
    'CONFIG_ALERT_HORN': 'false',
    'CONFIG_DOORS_UNLOCK': 'true',
    'CONFIG_REQUIRE_CONFIRM_UNLOCK': 'true'
};

function demonstrateEnvironmentDetection() {
    console.log('🚂 Railway Environment Detection Demo\n');
    
    // Show current environment
    console.log('📍 Current Environment:');
    console.log(`   Platform: ${process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local'}`);
    console.log(`   Environment: ${process.env.RAILWAY_ENVIRONMENT || 'development'}`);
    console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Show Railway variables (if available)
    console.log('\n🔍 Railway Variables:');
    Object.entries(railwayEnvVars).forEach(([key, value]) => {
        const actualValue = process.env[key];
        const status = actualValue ? '✅' : '❌';
        const displayValue = actualValue || `(demo: ${value})`;
        console.log(`   ${status} ${key}: ${displayValue}`);
    });
    
    // Show configuration overrides
    console.log('\n⚙️ Configuration Overrides:');
    Object.entries(configOverrides).forEach(([key, value]) => {
        const actualValue = process.env[key];
        const status = actualValue ? '✅' : '⚠️';
        const displayValue = actualValue || `(demo: ${value})`;
        console.log(`   ${status} ${key}: ${displayValue}`);
    });
    
    // Show what the API would detect
    console.log('\n🤖 API Detection Result:');
    const detectedPlatform = process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local';
    const detectedEnv = process.env.RAILWAY_ENVIRONMENT || 'development';
    const configSource = Object.keys(configOverrides).some(key => process.env[key]) ? 'environment_variables' : 'config_file';
    
    console.log(`   Platform: ${detectedPlatform}`);
    console.log(`   Environment: ${detectedEnv}`);
    console.log(`   Config Source: ${configSource}`);
    
    // Show deployment info that would be available
    console.log('\n📋 Deployment Info Available to Bots:');
    console.log('   {');
    console.log(`     "platform": "${detectedPlatform}",`);
    console.log(`     "environment": "${detectedEnv}",`);
    console.log(`     "project_id": "${process.env.RAILWAY_PROJECT_ID || 'local'}",`);
    console.log(`     "service_id": "${process.env.RAILWAY_SERVICE_ID || 'local'}",`);
    console.log(`     "git_info": {`);
    console.log(`       "branch": "${process.env.RAILWAY_GIT_BRANCH || 'unknown'}",`);
    console.log(`       "commit": "${process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown'}",`);
    console.log(`       "repo": "${process.env.RAILWAY_GIT_REPO_OWNER || 'unknown'}/${process.env.RAILWAY_GIT_REPO_NAME || 'unknown'}"`);
    console.log('     }');
    console.log('   }');
}

async function testApiEndpoints() {
    console.log('\n🧪 Testing API Endpoints for Environment Info\n');
    
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';
    
    try {
        // Test help endpoint
        console.log('Testing /help endpoint...');
        const helpResponse = await axios.get(`${API_BASE}/help`);
        
        if (helpResponse.data.data.environment_status) {
            console.log('✅ Environment status available in /help');
            const envStatus = helpResponse.data.data.environment_status;
            console.log(`   Platform: ${envStatus.deployment_info.platform}`);
            console.log(`   Environment: ${envStatus.deployment_info.environment}`);
            console.log(`   Status: ${envStatus.overall_status}`);
        } else {
            console.log('❌ Environment status not found in /help');
        }
        
        // Test contract endpoint
        console.log('\nTesting /contract endpoint...');
        const contractResponse = await axios.get(`${API_BASE}/contract`, {
            headers: { 'Authorization': 'Bearer brandt-car-boltaire-2025' }
        });
        
        if (contractResponse.data.data.deployment) {
            console.log('✅ Deployment info available in /contract');
            const deployment = contractResponse.data.data.deployment;
            console.log(`   Platform: ${deployment.platform}`);
            console.log(`   Environment: ${deployment.environment}`);
            console.log(`   Status: ${deployment.status}`);
            console.log(`   Config Source: ${deployment.configuration_source}`);
        } else {
            console.log('❌ Deployment info not found in /contract');
        }
        
    } catch (error) {
        console.log('⚠️  API not available (server may not be running)');
        console.log('   Start server with: node server.js');
    }
}

function showBotIntegrationExample() {
    console.log('\n🤖 Bot Integration Example\n');
    
    console.log('// Example: Bot checking environment before execution');
    console.log('const response = await axios.get("/help");');
    console.log('const envStatus = response.data.data.environment_status;');
    console.log('');
    console.log('if (envStatus.deployment_info.platform === "Railway") {');
    console.log('  console.log("Running on Railway production");');
    console.log('  console.log(`Environment: ${envStatus.deployment_info.environment}`);');
    console.log(`  console.log(`Git branch: ${envStatus.deployment_info.git_info.branch}`);`);
    console.log(`  console.log(`Commit: ${envStatus.deployment_info.git_info.commit}`);`);
    console.log('} else {');
    console.log('  console.log("Running locally");');
    console.log('}');
    console.log('');
    console.log('// Check configuration source');
    console.log('if (envStatus.configuration_overrides.active_overrides > 0) {');
    console.log('  console.log("Configuration overridden by environment variables");');
    console.log('} else {');
    console.log('  console.log("Using config.json file");');
    console.log('}');
    console.log('');
    console.log('// Check overall health');
    console.log('if (envStatus.overall_status === "healthy") {');
    console.log('  console.log("All required environment variables configured");');
    console.log('} else {');
    console.log('  console.log("Environment configuration issues detected");');
    console.log('}');
}

async function main() {
    console.log('🚀 Railway Environment Detection and API Contract Demo');
    console.log('=' .repeat(60));
    
    demonstrateEnvironmentDetection();
    
    console.log('\n' + '='.repeat(60));
    await testApiEndpoints();
    
    console.log('\n' + '='.repeat(60));
    showBotIntegrationExample();
    
    console.log('\n💡 Key Benefits for Bot Integration:');
    console.log('   • Automatic environment detection');
    console.log('   • Configuration override support');
    console.log('   • Real-time deployment information');
    console.log('   • Environment-specific behavior');
    console.log('   • Git commit tracking for debugging');
    console.log('   • Health status monitoring');
    
    console.log('\n📖 For complete API contract, call: GET /contract');
    console.log('📖 For current command status, call: GET /help');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { demonstrateEnvironmentDetection, testApiEndpoints }; 