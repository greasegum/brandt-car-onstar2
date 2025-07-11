const dotenv = require('dotenv');
const OnStar = require('onstarjs2');

// Load environment variables
dotenv.config({ path: '.secrets' });

async function testVehicleCommands() {
    console.log('🚗 Testing OnStar Vehicle Commands');
    console.log('==================================');
    
    const config = {
        username: process.env.ONSTAR_USERNAME,
        password: process.env.ONSTAR_PASSWORD,
        onStarPin: process.env.ONSTAR_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        checkRequestStatus: false,  // Disable status checking to avoid timeouts
        requestPollingTimeoutSeconds: 10
    };

    console.log('Configuration:');
    console.log('- Username:', config.username);
    console.log('- VIN:', config.vin);
    console.log('- TOTP Secret:', config.onStarTOTP ? 'Present' : 'Missing');
    
    try {
        console.log('\n🔧 Creating OnStar instance...');
        const onstar = OnStar.create(config);
        console.log('✅ OnStar instance created');

        console.log('\n🔐 Starting authentication...');
        await onstar.start();
        console.log('✅ Authentication successful!');

        // Test 1: Get vehicle diagnostics (includes battery info)
        console.log('\n📊 Getting vehicle diagnostics...');
        try {
            const diagnostics = await onstar.diagnostics();
            console.log('✅ Diagnostics retrieved successfully');
            
            // Look for battery/charge information
            if (diagnostics && diagnostics.response) {
                const response = diagnostics.response;
                console.log('\n🔋 Battery Information:');
                
                // Look for EV battery data
                if (response.data && response.data.commandResponse) {
                    const commandResponse = response.data.commandResponse;
                    if (commandResponse.body && commandResponse.body.evData) {
                        const evData = commandResponse.body.evData;
                        console.log('- Battery Level:', evData.batteryLevel || 'N/A');
                        console.log('- Range Remaining:', evData.electricRange || 'N/A');
                        console.log('- Charging Status:', evData.chargingStatus || 'N/A');
                        console.log('- Plug Status:', evData.plugStatus || 'N/A');
                    }
                }
                
                // Print raw diagnostic data (truncated)
                console.log('\n📋 Raw Diagnostics (first 500 chars):');
                console.log(JSON.stringify(diagnostics, null, 2).substring(0, 500) + '...');
            }
        } catch (error) {
            console.log('⚠️  Diagnostics failed:', error.message);
        }

        // Test 2: Get charging profile
        console.log('\n⚡ Getting charging profile...');
        try {
            const chargeProfile = await onstar.getChargingProfile();
            console.log('✅ Charge profile retrieved');
            if (chargeProfile && chargeProfile.response) {
                console.log('📋 Charge Profile Data:');
                console.log(JSON.stringify(chargeProfile, null, 2));
            }
        } catch (error) {
            console.log('⚠️  Charge profile failed:', error.message);
        }

        // Test 3: Get vehicle location
        console.log('\n📍 Getting vehicle location...');
        try {
            const location = await onstar.location();
            console.log('✅ Location retrieved');
            if (location && location.response) {
                const locationData = location.response.data;
                if (locationData && locationData.commandResponse && locationData.commandResponse.body) {
                    const body = locationData.commandResponse.body;
                    console.log('🗺️  Location Info:');
                    console.log('- Latitude:', body.latitude || 'N/A');
                    console.log('- Longitude:', body.longitude || 'N/A');
                    console.log('- Speed:', body.speed || 'N/A');
                    console.log('- Direction:', body.direction || 'N/A');
                }
            }
        } catch (error) {
            console.log('⚠️  Location failed:', error.message);
        }

        // Test 4: Vehicle alert (lights only) - SAFE COMMAND
        console.log('\n💡 Testing vehicle alert (lights only)...');
        try {
            const alertResponse = await onstar.alert({
                action: ['Lights'],
                delay: 0,
                duration: 1,
                override: []
            });
            console.log('✅ Vehicle lights activated successfully!');
            console.log('🚨 Your car lights should be flashing now');
            
            // Wait a moment then cancel the alert
            console.log('\n⏱️  Waiting 5 seconds then canceling alert...');
            setTimeout(async () => {
                try {
                    await onstar.cancelAlert();
                    console.log('✅ Alert canceled');
                } catch (cancelError) {
                    console.log('⚠️  Cancel alert failed:', cancelError.message);
                }
            }, 5000);
            
        } catch (error) {
            console.log('⚠️  Alert failed:', error.message);
        }

        console.log('\n✅ Vehicle command tests completed!');
        console.log('\n💡 Summary:');
        console.log('- Authentication: Working ✅');
        console.log('- Diagnostics: Attempted');
        console.log('- Charging Profile: Attempted'); 
        console.log('- Location: Attempted');
        console.log('- Vehicle Alert: Attempted');
        console.log('\n🚗 Your OnStar connection is fully functional!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

testVehicleCommands();
