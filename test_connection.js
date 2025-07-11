const dotenv = require('dotenv');
const OnStar = require('onstarjs2');

// Load environment variables
dotenv.config({ path: '.secrets' });

async function testOnStarConnection() {
    console.log('🚗 Testing OnStar Connection...');
    console.log('TOTP Secret:', process.env.ONSTAR_TOTP_SECRET ? 'Set ✓' : 'Missing ✗');
    
    const config = {
        username: process.env.ONSTAR_USERNAME || process.env.GM_USERNAME,
        password: process.env.ONSTAR_PASSWORD || process.env.GM_PASSWORD,
        onStarPin: process.env.ONSTAR_PIN || process.env.GM_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        checkRequestStatus: true,
        requestPollingTimeoutSeconds: 30,
        requestPollingIntervalSeconds: 6
    };

    console.log('Config loaded:');
    console.log('- Username:', config.username);
    console.log('- Device ID:', config.deviceId);
    console.log('- VIN:', config.vin);
    console.log('- TOTP Secret:', config.onStarTOTP ? 'Present' : 'Missing');
    
    try {
        const onstar = OnStar.create(config);
        
        console.log('\n🔐 Attempting authentication...');
        await onstar.start();
        
        console.log('✅ Authentication successful!');
        
        // Test getting account vehicles
        console.log('\n🚙 Getting account vehicles...');
        const vehicles = await onstar.getAccountVehicles();
        console.log('Vehicles found:', JSON.stringify(vehicles, null, 2));
        
        // Test getting vehicle status
        console.log('\n📊 Getting vehicle status...');
        const status = await onstar.diagnostics();
        console.log('Vehicle status received:', status ? 'Success' : 'No data');
        
        console.log('\n✅ All tests passed! OnStar connection is working.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}

testOnStarConnection();
