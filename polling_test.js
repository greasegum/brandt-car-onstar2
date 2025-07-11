const dotenv = require('dotenv');
const OnStar = require('onstarjs2');

// Load environment variables
dotenv.config({ path: '.secrets' });

async function testWithResultPolling() {
    console.log('🔋 Testing OnStar with Result Polling');
    console.log('====================================');
    
    const config = {
        username: process.env.ONSTAR_USERNAME,
        password: process.env.ONSTAR_PASSWORD,
        onStarPin: process.env.ONSTAR_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        checkRequestStatus: true,  // Enable status checking!
        requestPollingTimeoutSeconds: 60,
        requestPollingIntervalSeconds: 6
    };

    try {
        console.log('🔧 Creating OnStar instance with polling enabled...');
        const onstar = OnStar.create(config);
        
        console.log('🔐 Authenticating...');
        await onstar.start();
        console.log('✅ Authentication successful!');

        // Test 1: Get diagnostics with polling
        console.log('\n📊 Getting vehicle diagnostics (with polling)...');
        try {
            const diagnostics = await onstar.diagnostics();
            console.log('✅ Diagnostics completed!');
            
            // Check for the actual diagnostic data
            if (diagnostics && diagnostics.response && diagnostics.response.data) {
                const data = diagnostics.response.data;
                
                // Check if we have completed data now
                if (data.commandResponse && data.commandResponse.body) {
                    console.log('\n🔋 Battery/EV Data Found!');
                    const body = data.commandResponse.body;
                    
                    // Log all top-level keys
                    console.log('📊 Available data keys:', Object.keys(body));
                    
                    // Look for specific EV-related data
                    ['batteryLevel', 'electricRange', 'chargingStatus', 'plugStatus', 
                     'fuelLevel', 'range', 'odometer', 'tirePressure'].forEach(key => {
                        if (body[key] !== undefined) {
                            console.log(`  🔸 ${key}:`, body[key]);
                        }
                    });
                    
                    // Print first 1000 chars of body for inspection
                    console.log('\n📋 Diagnostic body (first 1000 chars):');
                    console.log(JSON.stringify(body, null, 2).substring(0, 1000) + '...');
                } else {
                    console.log('⚠️  Command response body is empty or still in progress');
                    console.log('Response data:', JSON.stringify(data, null, 2));
                }
            }
            
        } catch (diagError) {
            console.log('❌ Diagnostics failed:', diagError.message);
        }

        // Test 2: Simple, safe vehicle command that might work
        console.log('\n🚨 Testing simple vehicle command (cancel any existing alerts)...');
        try {
            const cancelResult = await onstar.cancelAlert();
            console.log('✅ Cancel alert command completed');
            if (cancelResult && cancelResult.response) {
                console.log('📡 Cancel alert status:', cancelResult.response.status);
                console.log('📡 Cancel alert message:', cancelResult.response.statusText);
            }
        } catch (cancelError) {
            console.log('⚠️  Cancel alert failed (probably no active alerts):', cancelError.message);
        }

        console.log('\n✅ Polling test completed!');
        console.log('\n💡 Summary:');
        console.log('- Authentication: ✅ Working');
        console.log('- Polling: ✅ Enabled');
        console.log('- Diagnostics: Attempted with full polling');
        console.log('- Cancel Alert: Attempted (safe command)');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

testWithResultPolling();
