const dotenv = require('dotenv');
const OnStar = require('onstarjs2');
const util = require('util');

// Load environment variables
dotenv.config({ path: '.secrets' });

function safeStringify(obj, maxDepth = 3) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, val) => {
        if (val != null && typeof val === "object") {
            if (seen.has(val)) {
                return "[Circular]";
            }
            seen.add(val);
        }
        return val;
    }, 2);
}

function extractBatteryInfo(diagnostics) {
    try {
        // Try different possible paths for EV data
        const paths = [
            'response.data.commandResponse.body.evData',
            'response.data.commandResponse.body',
            'response.data.evData',
            'response.data',
            'data.commandResponse.body.evData',
            'data.commandResponse.body',
            'data.evData',
            'data'
        ];
        
        for (const path of paths) {
            const value = path.split('.').reduce((obj, key) => obj && obj[key], diagnostics);
            if (value) {
                console.log(`🔍 Found data at path: ${path}`);
                console.log('📊 Data structure:', typeof value);
                if (typeof value === 'object') {
                    const keys = Object.keys(value);
                    console.log('🔑 Available keys:', keys.slice(0, 10)); // First 10 keys
                    
                    // Look for battery-related keys
                    const batteryKeys = keys.filter(key => 
                        key.toLowerCase().includes('battery') || 
                        key.toLowerCase().includes('charge') || 
                        key.toLowerCase().includes('electric') ||
                        key.toLowerCase().includes('ev')
                    );
                    
                    if (batteryKeys.length > 0) {
                        console.log('🔋 Battery-related keys found:', batteryKeys);
                        batteryKeys.forEach(key => {
                            console.log(`  - ${key}:`, value[key]);
                        });
                    }
                }
                return value;
            }
        }
        return null;
    } catch (error) {
        console.log('❌ Error extracting battery info:', error.message);
        return null;
    }
}

async function testBatteryStatus() {
    console.log('🔋 Testing EV Battery Status');
    console.log('============================');
    
    const config = {
        username: process.env.ONSTAR_USERNAME,
        password: process.env.ONSTAR_PASSWORD,
        onStarPin: process.env.ONSTAR_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        checkRequestStatus: false,
        requestPollingTimeoutSeconds: 15
    };

    try {
        console.log('🔧 Creating OnStar instance...');
        const onstar = OnStar.create(config);
        
        console.log('🔐 Authenticating...');
        await onstar.start();
        console.log('✅ Authentication successful!');

        // Test diagnostics with better error handling
        console.log('\n📊 Getting vehicle diagnostics...');
        try {
            const diagnostics = await onstar.diagnostics();
            console.log('✅ Diagnostics retrieved');
            
            // Extract and display battery information
            console.log('\n🔋 Analyzing battery data...');
            const batteryData = extractBatteryInfo(diagnostics);
            
            // Also try to get the response status
            if (diagnostics && diagnostics.response) {
                console.log('📡 Response status:', diagnostics.response.status);
                console.log('📡 Response message:', diagnostics.response.message);
            }
            
        } catch (diagError) {
            console.log('❌ Diagnostics failed:', diagError.message);
        }

        // Test charge profile
        console.log('\n⚡ Getting charging profile...');
        try {
            const chargeProfile = await onstar.getChargingProfile();
            console.log('✅ Charge profile retrieved');
            
            if (chargeProfile && chargeProfile.response) {
                console.log('📡 Charge profile status:', chargeProfile.response.status);
                console.log('📡 Charge profile message:', chargeProfile.response.message);
                
                // Try to extract charge data safely
                try {
                    const chargeData = chargeProfile.response.data;
                    if (chargeData) {
                        console.log('📊 Charge data keys:', Object.keys(chargeData));
                    }
                } catch (e) {
                    console.log('⚠️  Could not parse charge data');
                }
            }
            
        } catch (chargeError) {
            console.log('❌ Charge profile failed:', chargeError.message);
        }

        // Test a simple alert command (lights only, very short duration)
        console.log('\n💡 Testing simple vehicle alert...');
        try {
            // Try a simpler alert format
            const alertResponse = await onstar.alert({
                action: 'Lights',
                delay: 0,
                duration: 1
            });
            console.log('✅ Vehicle alert sent successfully!');
            console.log('🚨 Check if your car lights flashed');
            
        } catch (alertError) {
            console.log('❌ Alert failed:', alertError.message);
            
            // Try alternative alert format
            console.log('🔄 Trying alternative alert format...');
            try {
                const altAlertResponse = await onstar.alert({
                    action: ['Lights']
                });
                console.log('✅ Alternative alert format worked!');
            } catch (altError) {
                console.log('❌ Alternative alert also failed:', altError.message);
            }
        }

        console.log('\n✅ Battery status test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBatteryStatus();
