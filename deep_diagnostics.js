const dotenv = require('dotenv');
const OnStar = require('onstarjs2');

// Load environment variables
dotenv.config({ path: '.secrets' });

function deepInspect(obj, path = '', maxDepth = 4, currentDepth = 0) {
    if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
        return;
    }
    
    const seen = new WeakSet();
    
    try {
        Object.keys(obj).forEach(key => {
            if (seen.has(obj[key])) return;
            if (obj[key] && typeof obj[key] === 'object') {
                seen.add(obj[key]);
            }
            
            const currentPath = path ? `${path}.${key}` : key;
            const value = obj[key];
            
            if (typeof value === 'object' && value !== null) {
                console.log(`📁 ${currentPath}: [object with ${Object.keys(value).length} keys]`);
                
                // Look for battery/EV related keys
                const keys = Object.keys(value);
                const evKeys = keys.filter(k => 
                    k.toLowerCase().includes('battery') ||
                    k.toLowerCase().includes('charge') ||
                    k.toLowerCase().includes('electric') ||
                    k.toLowerCase().includes('ev') ||
                    k.toLowerCase().includes('range') ||
                    k.toLowerCase().includes('level')
                );
                
                if (evKeys.length > 0) {
                    console.log(`🔋 EV-related keys in ${currentPath}:`, evKeys);
                    evKeys.forEach(evKey => {
                        console.log(`  🔸 ${currentPath}.${evKey}:`, value[evKey]);
                    });
                }
                
                // Continue recursing
                if (currentDepth < maxDepth - 1) {
                    deepInspect(value, currentPath, maxDepth, currentDepth + 1);
                }
            } else {
                console.log(`📄 ${currentPath}:`, value);
            }
        });
    } catch (error) {
        console.log(`❌ Error inspecting ${path}:`, error.message);
    }
}

async function deepDiagnostics() {
    console.log('🔍 Deep OnStar Diagnostics Analysis');
    console.log('===================================');
    
    const config = {
        username: process.env.ONSTAR_USERNAME,
        password: process.env.ONSTAR_PASSWORD,
        onStarPin: process.env.ONSTAR_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        checkRequestStatus: false,
        requestPollingTimeoutSeconds: 20
    };

    try {
        console.log('🔧 Creating OnStar instance...');
        const onstar = OnStar.create(config);
        
        console.log('🔐 Authenticating...');
        await onstar.start();
        console.log('✅ Authentication successful!');

        // Deep analysis of diagnostics
        console.log('\n📊 Getting and analyzing diagnostics data...');
        try {
            const diagnostics = await onstar.diagnostics();
            console.log('✅ Diagnostics retrieved');
            
            console.log('\n🔍 Deep inspection of diagnostics response:');
            deepInspect(diagnostics, 'diagnostics');
            
        } catch (diagError) {
            console.log('❌ Diagnostics failed:', diagError.message);
        }

        // Deep analysis of charge profile
        console.log('\n⚡ Getting and analyzing charge profile...');
        try {
            const chargeProfile = await onstar.getChargingProfile();
            console.log('✅ Charge profile retrieved');
            
            console.log('\n🔍 Deep inspection of charge profile:');
            deepInspect(chargeProfile, 'chargeProfile');
            
        } catch (chargeError) {
            console.log('❌ Charge profile failed:', chargeError.message);
        }

        // Try to get account vehicles for comparison
        console.log('\n🚗 Getting account vehicles...');
        try {
            const vehicles = await onstar.getAccountVehicles();
            console.log('✅ Vehicles data retrieved');
            
            console.log('\n🔍 Deep inspection of vehicles data:');
            deepInspect(vehicles, 'vehicles', 3);
            
        } catch (vehiclesError) {
            console.log('❌ Vehicles failed:', vehiclesError.message);
        }

        console.log('\n✅ Deep diagnostics analysis completed!');

    } catch (error) {
        console.error('❌ Deep analysis failed:', error.message);
    }
}

deepDiagnostics();
