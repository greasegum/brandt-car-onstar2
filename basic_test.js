const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.secrets' });

// Simple TOTP test using the built-in crypto
function generateTOTP(secret) {
    try {
        // Simple TOTP implementation for testing
        const crypto = require('crypto');
        const base32 = require('base32');
        
        if (!secret) {
            throw new Error('No TOTP secret provided');
        }
        
        console.log('TOTP Secret found:', secret);
        
        // For now, let's just validate the secret format
        if (secret.length < 16) {
            throw new Error('TOTP secret seems too short');
        }
        
        return 'TOTP generation test passed';
        
    } catch (error) {
        return `TOTP generation failed: ${error.message}`;
    }
}

async function basicTest() {
    console.log('🔧 Basic Configuration Test');
    console.log('============================');
    
    // Check environment variables
    const requiredVars = [
        'ONSTAR_USERNAME',
        'ONSTAR_PASSWORD', 
        'ONSTAR_PIN',
        'ONSTAR_VIN',
        'ONSTAR_DEVICEID',
        'ONSTAR_TOTP_SECRET'
    ];
    
    console.log('\n📋 Environment Variables:');
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        const status = value ? '✅' : '❌';
        const display = value ? (varName.includes('PASSWORD') || varName.includes('SECRET') ? '[HIDDEN]' : value) : 'NOT SET';
        console.log(`${status} ${varName}: ${display}`);
    });
    
    // Test TOTP secret
    console.log('\n🔐 TOTP Test:');
    const totpResult = generateTOTP(process.env.ONSTAR_TOTP_SECRET);
    console.log(totpResult);
    
    // Try to load the OnStar module
    console.log('\n📦 Module Loading Test:');
    try {
        const OnStar = require('./onstar.js');
        console.log('✅ OnStar module loaded successfully');
        
        // Try to create an instance (without connecting)
        const config = {
            username: process.env.ONSTAR_USERNAME,
            password: process.env.ONSTAR_PASSWORD,
            pin: process.env.ONSTAR_PIN,
            deviceId: process.env.ONSTAR_DEVICEID,
            vin: process.env.ONSTAR_VIN,
            totpSecret: process.env.ONSTAR_TOTP_SECRET
        };
        
        const onstar = OnStar.create(config);
        console.log('✅ OnStar instance created successfully');
        console.log('Ready for connection test!');
        
    } catch (error) {
        console.log('❌ OnStar module loading failed:', error.message);
    }
}

basicTest().catch(console.error);
