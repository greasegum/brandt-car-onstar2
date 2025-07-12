#!/usr/bin/env node

/**
 * Interactive OnStar Test Script
 * 
 * Provides a menu-driven interface to test different OnStar functions:
 * - Vehicle status and diagnostics
 * - Remote commands (lock/unlock, start, horn, lights)
 * - Location services
 * - Account information
 * 
 * Run with: node mytests/interactive_test.js
 */

const OnStar = require('onstarjs2');
const readline = require('readline');
require('dotenv').config();

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// OnStar configuration
const config = {
    username: process.env.ONSTAR_USERNAME,
    password: process.env.ONSTAR_PASSWORD,
    vin: process.env.ONSTAR_VIN,
    onStarPin: process.env.ONSTAR_PIN,
    onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
    deviceId: process.env.ONSTAR_DEVICEID,
    tokenLocation: './',
    checkRequestStatus: true,
    requestPollingTimeoutSeconds: 60,
    requestPollingIntervalSeconds: 3
};

let onstar = null;

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

function logSection(title) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔧 ${title}`);
    console.log(`${'='.repeat(50)}`);
}

function logSubSection(title) {
    console.log(`\n📋 ${title}`);
    console.log(`${'-'.repeat(30)}`);
}

function displayVehicleData(diagnostics) {
    if (!diagnostics || !diagnostics.response?.data?.commandResponse?.body?.diagnosticResponse) {
        log('No diagnostic data available', 'warning');
        return;
    }

    const diagnosticData = diagnostics.response.data.commandResponse.body.diagnosticResponse;
    
    logSubSection('VEHICLE STATUS SUMMARY');
    
    // Extract key metrics
    let batteryLevel = 'N/A';
    let evRange = 'N/A';
    let odometer = 'N/A';
    let plugState = 'N/A';
    let temperature = 'N/A';
    let tirePressure = {};

    diagnosticData.forEach(diagnostic => {
        if (diagnostic.diagnosticElement && diagnostic.diagnosticElement.length > 0) {
            diagnostic.diagnosticElement.forEach(element => {
                if (element.name === 'EV BATTERY LEVEL' && element.value) {
                    batteryLevel = `${element.value}${element.unit}`;
                }
                if (element.name === 'EV RANGE' && element.value) {
                    evRange = `${element.value} ${element.unit}`;
                }
                if (element.name === 'ODOMETER' && element.value) {
                    odometer = `${element.value} ${element.unit}`;
                }
                if (element.name === 'EV PLUG STATE' && element.value) {
                    plugState = element.value;
                }
                if (element.name === 'AMBIENT AIR TEMPERATURE' && element.value) {
                    temperature = `${element.value} ${element.unit}`;
                }
                if (element.name.includes('TIRE PRESSURE') && element.value) {
                    const tire = element.name.split(' ').pop(); // Get LF, LR, RF, RR
                    tirePressure[tire] = `${element.value} ${element.unit}`;
                }
            });
        }
    });

    // Display summary
    console.log(`🔋 Battery Level: ${batteryLevel}`);
    console.log(`⚡ EV Range: ${evRange}`);
    console.log(`🛣️  Odometer: ${odometer}`);
    console.log(`🔌 Plug State: ${plugState}`);
    console.log(`🌡️  Temperature: ${temperature}`);
    
    if (Object.keys(tirePressure).length > 0) {
        console.log(`🛞 Tire Pressure:`);
        Object.entries(tirePressure).forEach(([tire, pressure]) => {
            console.log(`   ${tire}: ${pressure}`);
        });
    }
}

// Test functions
async function testAuthentication() {
    logSection('AUTHENTICATION');
    
    try {
        log('Initializing OnStar connection...');
        onstar = OnStar.create(config);
        
        log('Testing authentication with getAccountVehicles...');
        const vehicles = await onstar.getAccountVehicles();
        
        if (vehicles && vehicles.response && vehicles.response.data) {
            log('✅ Authentication successful!', 'success');
            log(`Found ${vehicles.response.data.length || 0} vehicle(s) in account`);
            
            if (vehicles.response.data.length > 0) {
                const vehicle = vehicles.response.data[0];
                console.log(`\n🚗 Primary Vehicle:`);
                console.log(`   VIN: ${vehicle.vin}`);
                console.log(`   Model: ${vehicle.modelYear} ${vehicle.brand} ${vehicle.model}`);
                console.log(`   Nickname: ${vehicle.nickname || 'Not set'}`);
            }
            
            log('🎉 Ready for commands!', 'success');
        } else {
            log('⚠️ Authentication successful but no vehicle data returned', 'warning');
        }
        
        return true;
    } catch (error) {
        log(`❌ Authentication failed: ${error.message}`, 'error');
        if (error.response) {
            log(`HTTP Status: ${error.response.status}`, 'error');
        }
        onstar = null; // Clear failed connection
        return false;
    }
}

async function testVehicleDiagnostics() {
    logSection('VEHICLE DIAGNOSTICS');
    
    if (!onstar) {
        log('❌ OnStar not initialized. Please authenticate first.', 'error');
        return false;
    }
    
    try {
        log('Fetching comprehensive vehicle diagnostics...');
        const diagnostics = await onstar.diagnostics({
            diagnosticItem: [
                "EV BATTERY LEVEL",
                "EV CHARGE STATE",
                "EV ESTIMATED CHARGE END",
                "EV PLUG STATE",
                "EV PLUG VOLTAGE",
                "VEHICLE RANGE",
                "ENERGY EFFICIENCY",
                "ODOMETER",
                "TIRE PRESSURE",
                "AMBIENT AIR TEMPERATURE",
                "LAST TRIP DISTANCE",
                "LAST TRIP FUEL ECONOMY"
            ]
        });
        
        log('✅ Diagnostics retrieved successfully!', 'success');
        displayVehicleData(diagnostics);
        
        return true;
    } catch (error) {
        log(`❌ Diagnostics failed: ${error.message}`, 'error');
        return false;
    }
}

async function testVehicleLocation() {
    logSection('VEHICLE LOCATION');
    
    if (!onstar) {
        log('❌ OnStar not initialized. Please authenticate first.', 'error');
        return false;
    }
    
    try {
        log('Requesting vehicle location...');
        const location = await onstar.location();
        
        if (location && location.response && location.response.data) {
            log('✅ Location retrieved successfully!', 'success');
            const data = location.response.data.commandResponse.body;
            
            console.log(`\n📍 Vehicle Location:`);
            console.log(`   Latitude: ${data.latitude || 'N/A'}`);
            console.log(`   Longitude: ${data.longitude || 'N/A'}`);
            console.log(`   Heading: ${data.heading || 'N/A'}`);
            console.log(`   Speed: ${data.speed || 'N/A'}`);
            console.log(`   Timestamp: ${data.timestamp || 'N/A'}`);
            
            if (data.latitude && data.longitude) {
                console.log(`\n🗺️  Google Maps Link:`);
                console.log(`   https://maps.google.com/?q=${data.latitude},${data.longitude}`);
            }
        } else {
            log('⚠️ Location request successful but no location data returned', 'warning');
        }
        
        return true;
    } catch (error) {
        log(`❌ Location request failed: ${error.message}`, 'error');
        return false;
    }
}

async function testRemoteCommands() {
    logSection('REMOTE COMMANDS');
    
    if (!onstar) {
        log('❌ OnStar not initialized. Please authenticate first.', 'error');
        return false;
    }
    
    console.log('\nAvailable remote commands:');
    console.log('1. Lock Vehicle');
    console.log('2. Unlock Vehicle');
    console.log('3. Start Vehicle');
    console.log('4. Cancel Start Vehicle');
    console.log('5. Honk Horn');
    console.log('6. Flash Lights');
    console.log('7. Back to main menu');
    
    return new Promise((resolve) => {
        rl.question('\nSelect command (1-7): ', async (answer) => {
            try {
                switch (answer.trim()) {
                    case '1':
                        log('🔒 Sending lock vehicle command...');
                        const lockResult = await onstar.lockVehicle();
                        log('✅ Lock command sent successfully!', 'success');
                        break;
                        
                    case '2':
                        log('🔓 Sending unlock vehicle command...');
                        const unlockResult = await onstar.unlockVehicle();
                        log('✅ Unlock command sent successfully!', 'success');
                        break;
                        
                    case '3':
                        log('🚀 Sending start vehicle command...');
                        const startResult = await onstar.startVehicle();
                        log('✅ Start command sent successfully!', 'success');
                        break;
                        
                    case '4':
                        log('⏹️ Sending cancel start command...');
                        const cancelResult = await onstar.cancelStartVehicle();
                        log('✅ Cancel start command sent successfully!', 'success');
                        break;
                        
                    case '5':
                        log('🔊 Sending honk horn command...');
                        const hornResult = await onstar.alertMyVehicle({ horn: true });
                        log('✅ Horn command sent successfully!', 'success');
                        break;
                        
                    case '6':
                        log('💡 Sending flash lights command...');
                        const lightsResult = await onstar.alertMyVehicle({ lights: true });
                        log('✅ Lights command sent successfully!', 'success');
                        break;
                        
                    case '7':
                        log('Returning to main menu...');
                        resolve(true);
                        return;
                        
                    default:
                        log('❌ Invalid selection', 'error');
                        resolve(false);
                        return;
                }
                
                // Show command result details if available
                if (lockResult || unlockResult || startResult || cancelResult || hornResult || lightsResult) {
                    const result = lockResult || unlockResult || startResult || cancelResult || hornResult || lightsResult;
                    if (result && result.response) {
                        console.log(`\n📊 Command Response:`);
                        console.log(`   Status: ${result.response.status || 'N/A'}`);
                        console.log(`   Message: ${result.response.data?.message || 'N/A'}`);
                    }
                }
                
                resolve(true);
            } catch (error) {
                log(`❌ Command failed: ${error.message}`, 'error');
                resolve(false);
            }
        });
    });
}

async function testAccountInfo() {
    logSection('ACCOUNT INFORMATION');
    
    if (!onstar) {
        log('❌ OnStar not initialized. Please authenticate first.', 'error');
        return false;
    }
    
    try {
        log('Fetching account vehicles...');
        const vehicles = await onstar.getAccountVehicles();
        
        if (vehicles && vehicles.response && vehicles.response.data) {
            log('✅ Account information retrieved successfully!', 'success');
            
            console.log(`\n👤 Account Summary:`);
            console.log(`   Total Vehicles: ${vehicles.response.data.length}`);
            
            vehicles.response.data.forEach((vehicle, index) => {
                console.log(`\n🚗 Vehicle ${index + 1}:`);
                console.log(`   VIN: ${vehicle.vin}`);
                console.log(`   Model: ${vehicle.modelYear} ${vehicle.brand} ${vehicle.model}`);
                console.log(`   Nickname: ${vehicle.nickname || 'Not set'}`);
                console.log(`   OnStar Status: ${vehicle.onStarStatus || 'Unknown'}`);
                console.log(`   Connected Services: ${vehicle.connectedServices || 'Unknown'}`);
            });
        } else {
            log('⚠️ Account request successful but no vehicle data returned', 'warning');
        }
        
        return true;
    } catch (error) {
        log(`❌ Account information failed: ${error.message}`, 'error');
        return false;
    }
}

async function showMainMenu() {
    console.clear();
    logSection('ONSTAR INTERACTIVE TEST SUITE');
    
    console.log('✅ Authenticated and ready for commands\n');
    
    console.log('Available Commands:');
    console.log('1. 🔋 Get Vehicle Diagnostics');
    console.log('2. 📍 Get Vehicle Location');
    console.log('3. 🎮 Remote Commands Menu');
    console.log('4. 👤 Get Account Information');
    console.log('5. 🔄 Refresh Authentication');
    console.log('6. 🚪 Exit');
    
    return new Promise((resolve) => {
        rl.question('\nSelect command (1-6): ', async (answer) => {
            let success = false;
            
            switch (answer.trim()) {
                case '1':
                    success = await testVehicleDiagnostics();
                    break;
                    
                case '2':
                    success = await testVehicleLocation();
                    break;
                    
                case '3':
                    success = await testRemoteCommands();
                    break;
                    
                case '4':
                    success = await testAccountInfo();
                    break;
                    
                case '5':
                    log('🔄 Refreshing authentication...');
                    onstar = null; // Clear existing connection
                    success = await testAuthentication();
                    break;
                    
                case '6':
                    log('👋 Goodbye!', 'success');
                    rl.close();
                    process.exit(0);
                    return;
                    
                default:
                    log('❌ Invalid selection', 'error');
                    resolve(false);
                    return;
            }
            
            if (success !== false) {
                console.log('\n' + '='.repeat(50));
                rl.question('Press Enter to continue...', () => {
                    resolve(true);
                });
            } else {
                resolve(false);
            }
        });
    });
}

// Main execution
async function main() {
    console.log('🚗 OnStar Interactive Test Suite');
    console.log('================================');
    console.log('This script allows you to test individual OnStar functions.');
    console.log('Make sure your .env file is configured with your OnStar credentials.\n');
    
    // Check environment
    if (!process.env.ONSTAR_USERNAME || !process.env.ONSTAR_PASSWORD) {
        log('❌ Missing OnStar credentials in .env file', 'error');
        console.log('Please ensure your .env file contains:');
        console.log('  ONSTAR_USERNAME=your_email');
        console.log('  ONSTAR_PASSWORD=your_password');
        console.log('  ONSTAR_VIN=your_vin');
        console.log('  ONSTAR_PIN=your_pin');
        console.log('  ONSTAR_TOTP_SECRET=your_totp_secret');
        console.log('  ONSTAR_DEVICEID=your_device_id');
        process.exit(1);
    }
    
    log('✅ Environment check passed', 'success');
    
    // Auto-authenticate on startup
    logSection('AUTO-AUTHENTICATION');
    log('🔄 Automatically authenticating on startup...');
    
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
        log('❌ Failed to authenticate automatically. Exiting.', 'error');
        process.exit(1);
    }
    
    log('🎉 Authentication successful! Ready for commands.', 'success');
    
    // Main loop
    while (true) {
        await showMainMenu();
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    log('\n👋 Shutting down gracefully...', 'success');
    rl.close();
    process.exit(0);
});

// Run the main function
main().catch(error => {
    log(`❌ Fatal error: ${error.message}`, 'error');
    rl.close();
    process.exit(1);
}); 