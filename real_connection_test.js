const dotenv = require('dotenv');
const OnStar = require('onstarjs2');  // Use the actual onstarjs2 package

// Load environment variables
dotenv.config({ path: '.secrets' });

async function testRealConnection() {
    console.log('🚗 Testing Real OnStar Connection');
    console.log('================================');
    
    const config = {
        username: process.env.ONSTAR_USERNAME,
        password: process.env.ONSTAR_PASSWORD,
        onStarPin: process.env.ONSTAR_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        requestTimeout: parseInt(process.env.ONSTAR_TIMEOUT) || 30000
    };

    console.log('Configuration:');
    console.log(`- Username: ${config.username}`);
    console.log(`- VIN: ${config.vin}`);
    console.log(`- Device ID: ${config.deviceId}`);
    console.log(`- TOTP Secret: ${config.onStarTOTP ? 'Present' : 'Missing'}`);
    console.log(`- Timeout: ${config.requestTimeout}ms`);
    
    try {
        console.log('\n🔧 Creating OnStar instance...');
        const onstar = OnStar.create(config);
        console.log('✅ OnStar instance created');
        
        console.log('\n🔐 Starting authentication...');
        await onstar.start();
        console.log('✅ Authentication successful!');
        
        console.log('\n🚙 Testing basic vehicle command (get vehicles)...');
        const vehicles = await onstar.getAccountVehicles();
        console.log('✅ Vehicles retrieved:', JSON.stringify(vehicles, null, 2));
        
        console.log('\n📊 Testing diagnostics...');
        const diagnostics = await onstar.diagnostics();
        console.log('✅ Diagnostics retrieved:', JSON.stringify(diagnostics, null, 2));
        
        console.log('\n🎉 All tests passed! OnStar connection is fully working.');
        
    } catch (error) {
        console.error('❌ Connection test failed:');
        console.error(`Error: ${error.message}`);
        
        if (error.response) {
            console.error(`HTTP Status: ${error.response.status}`);
            console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        
        if (error.code) {
            console.error(`Error Code: ${error.code}`);
        }
        
        // Check for common issues
        if (error.message.includes('401')) {
            console.error('\n💡 This looks like an authentication issue. Please check:');
            console.error('   - Username and password are correct');
            console.error('   - TOTP secret is properly configured');
            console.error('   - Device ID is valid');
        } else if (error.message.includes('timeout')) {
            console.error('\n💡 This looks like a timeout issue. The OnStar servers might be slow.');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
            console.error('\n💡 This looks like a network connectivity issue.');
        }
        
        process.exit(1);
    }
}

// Run the test
testRealConnection();
