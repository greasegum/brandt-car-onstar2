#!/usr/bin/env node

/**
 * Test script for database logging functionality
 * Verifies PostgreSQL integration and analytics endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'brandt-car-boltaire-2025';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

async function testDatabaseLogging() {
    console.log('🧪 Testing Database Logging Functionality\n');

    try {
        // Test 1: Make some API calls to generate logs
        console.log('Step 1: Generating test API calls...');
        
        const testCalls = [
            { method: 'GET', endpoint: '/status', description: 'Get vehicle status' },
            { method: 'GET', endpoint: '/help', description: 'Get help information' },
            { method: 'POST', endpoint: '/doors/lock', description: 'Lock doors' },
            { method: 'POST', endpoint: '/doors/unlock', endpoint: '/doors/unlock', data: { confirm: true }, description: 'Unlock doors with confirmation' },
            { method: 'POST', endpoint: '/alert/lights', data: { duration_seconds: 5 }, description: 'Try flash lights (should be disabled)' }
        ];

        for (const call of testCalls) {
            try {
                const config = {
                    method: call.method,
                    url: `${API_BASE}${call.endpoint}`,
                    headers
                };
                
                if (call.data) {
                    config.data = call.data;
                }
                
                const response = await axios(config);
                console.log(`   ✅ ${call.description}: ${response.status}`);
            } catch (error) {
                console.log(`   ⚠️  ${call.description}: ${error.response?.status || 'Error'} - ${error.response?.data?.message || error.message}`);
            }
        }

        // Wait a moment for logs to be written
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 2: Check analytics stats
        console.log('\nStep 2: Testing analytics stats endpoint...');
        const statsResponse = await axios.get(`${API_BASE}/analytics/stats?days=1`, { headers });
        
        if (statsResponse.status === 200) {
            console.log('✅ Analytics stats endpoint working');
            const stats = statsResponse.data.data.statistics;
            console.log(`   Total requests: ${stats.total_requests}`);
            console.log(`   Successful: ${stats.successful_requests}`);
            console.log(`   Failed: ${stats.failed_requests}`);
            console.log(`   Avg execution time: ${Math.round(stats.avg_execution_time || 0)}ms`);
        } else {
            console.log('❌ Analytics stats endpoint failed');
        }

        // Test 3: Check recent commands
        console.log('\nStep 3: Testing recent commands endpoint...');
        const recentResponse = await axios.get(`${API_BASE}/analytics/recent?limit=10`, { headers });
        
        if (recentResponse.status === 200) {
            console.log('✅ Recent commands endpoint working');
            const commands = recentResponse.data.data.commands;
            console.log(`   Recent commands: ${commands.length}`);
            
            if (commands.length > 0) {
                console.log('   Sample commands:');
                commands.slice(0, 3).forEach(cmd => {
                    console.log(`     • ${cmd.method} ${cmd.endpoint} - ${cmd.success ? '✅' : '❌'} (${cmd.execution_time_ms}ms)`);
                });
            }
        } else {
            console.log('❌ Recent commands endpoint failed');
        }

        // Test 4: Check error logs
        console.log('\nStep 4: Testing error logs endpoint...');
        const errorsResponse = await axios.get(`${API_BASE}/analytics/errors?days=1&limit=10`, { headers });
        
        if (errorsResponse.status === 200) {
            console.log('✅ Error logs endpoint working');
            const errors = errorsResponse.data.data.errors;
            console.log(`   Error logs: ${errors.length}`);
            
            if (errors.length > 0) {
                console.log('   Sample errors:');
                errors.slice(0, 2).forEach(error => {
                    console.log(`     • ${error.method} ${error.endpoint} - ${error.response_status} (${error.error_message})`);
                });
            }
        } else {
            console.log('❌ Error logs endpoint failed');
        }

        // Test 5: Check safety violations
        console.log('\nStep 5: Testing safety violations endpoint...');
        const safetyResponse = await axios.get(`${API_BASE}/analytics/safety?days=1`, { headers });
        
        if (safetyResponse.status === 200) {
            console.log('✅ Safety violations endpoint working');
            const violations = safetyResponse.data.data.violations;
            const breakdown = safetyResponse.data.data.risk_breakdown;
            console.log(`   Safety violations: ${violations.length}`);
            console.log(`   High risk attempts: ${breakdown.high_risk_attempts}`);
            console.log(`   Missing confirmations: ${breakdown.missing_confirmations}`);
            console.log(`   Disabled endpoint attempts: ${breakdown.disabled_endpoint_attempts}`);
        } else {
            console.log('❌ Safety violations endpoint failed');
        }

        console.log('\n✅ Database logging test completed successfully!');

    } catch (error) {
        console.error('❌ Database logging test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

async function testDatabaseConnection() {
    console.log('🔍 Testing Database Connection...\n');

    try {
        // Test health endpoint to see if database is connected
        const healthResponse = await axios.get(`${API_BASE}/health`);
        
        if (healthResponse.status === 200) {
            console.log('✅ Server is running');
            
            // Check if database logging is mentioned in server startup
            console.log('📊 Check server logs for database initialization message');
            console.log('   Look for: "Database logging enabled" or "Database logging disabled"');
        }
    } catch (error) {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   node server.js');
    }
}

async function showDatabaseSchema() {
    console.log('📋 Database Schema Information\n');
    
    console.log('Table: command_log');
    console.log('Columns:');
    console.log('  • id (SERIAL PRIMARY KEY)');
    console.log('  • timestamp (TIMESTAMP WITH TIME ZONE)');
    console.log('  • endpoint (VARCHAR(100))');
    console.log('  • method (VARCHAR(10))');
    console.log('  • user_agent (TEXT)');
    console.log('  • ip_address (INET)');
    console.log('  • api_key_hash (VARCHAR(64))');
    console.log('  • request_body (JSONB)');
    console.log('  • response_status (INTEGER)');
    console.log('  • response_body (JSONB)');
    console.log('  • execution_time_ms (INTEGER)');
    console.log('  • success (BOOLEAN)');
    console.log('  • error_message (TEXT)');
    console.log('  • vehicle_vin (VARCHAR(17))');
    console.log('  • command_type (VARCHAR(50))');
    console.log('  • safety_level (VARCHAR(20))');
    console.log('  • requires_confirmation (BOOLEAN)');
    console.log('  • confirmation_provided (BOOLEAN)');
    console.log('  • environment (VARCHAR(50))');
    console.log('  • deployment_id (VARCHAR(100))');
    
    console.log('\nIndexes:');
    console.log('  • idx_command_log_timestamp');
    console.log('  • idx_command_log_endpoint');
    console.log('  • idx_command_log_success');
    console.log('  • idx_command_log_vehicle_vin');
}

async function main() {
    console.log('🚀 Database Logging Test Suite');
    console.log('================================\n');
    
    await testDatabaseConnection();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await showDatabaseSchema();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await testDatabaseLogging();
    
    console.log('\n📊 Analytics Endpoints Available:');
    console.log('  • GET /analytics/stats - Command statistics');
    console.log('  • GET /analytics/recent - Recent commands');
    console.log('  • GET /analytics/errors - Error logs');
    console.log('  • GET /analytics/safety - Safety violations');
    console.log('  • POST /analytics/cleanup - Cleanup old logs');
    
    console.log('\n💡 Database Configuration:');
    console.log('   Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env');
    console.log('   Database will be automatically initialized on server startup');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testDatabaseLogging, testDatabaseConnection }; 