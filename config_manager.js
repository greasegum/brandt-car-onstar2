#!/usr/bin/env node

/**
 * Configuration Manager for Brandt Car API
 * Utility to easily enable/disable endpoints and manage security settings
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const API_BASE = 'http://localhost:8080';
const API_KEY = 'brandt-car-boltaire-2025';

// Load current configuration
function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (error) {
        console.error('❌ Failed to load config.json:', error.message);
        process.exit(1);
    }
}

// Save configuration
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('✅ Configuration saved to config.json');
        return true;
    } catch (error) {
        console.error('❌ Failed to save config.json:', error.message);
        return false;
    }
}

// Reload configuration on server
async function reloadServerConfig() {
    try {
        const response = await axios.post(`${API_BASE}/config/reload`, {}, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        console.log('✅ Server configuration reloaded successfully');
        return true;
    } catch (error) {
        console.log('⚠️  Could not reload server config (server may not be running)');
        return false;
    }
}

// Display current configuration
function showConfig() {
    const config = loadConfig();
    console.log('\n📋 Current Configuration:\n');
    
    console.log('🚗 Vehicle Control Endpoints:');
    console.log(`  Climate Start: ${config.api_endpoints.climate.start ? '✅' : '❌'}`);
    console.log(`  Climate Stop:  ${config.api_endpoints.climate.stop ? '✅' : '❌'}`);
    console.log(`  Door Lock:     ${config.api_endpoints.doors.lock ? '✅' : '❌'}`);
    console.log(`  Door Unlock:   ${config.api_endpoints.doors.unlock ? '✅' : '❌'}`);
    console.log(`  Trunk Lock:    ${config.api_endpoints.trunk.lock ? '✅' : '❌'}`);
    console.log(`  Trunk Unlock:  ${config.api_endpoints.trunk.unlock ? '✅' : '❌'}`);
    
    console.log('\n🚨 Alert Endpoints:');
    console.log(`  Flash Lights:  ${config.api_endpoints.alert.lights ? '✅' : '❌'}`);
    console.log(`  Horn:          ${config.api_endpoints.alert.horn ? '✅' : '❌'}`);
    console.log(`  Both:          ${config.api_endpoints.alert.both ? '✅' : '❌'}`);
    console.log(`  Cancel Alert:  ${config.api_endpoints.alert.cancel ? '✅' : '❌'}`);
    
    console.log('\n🔋 Charging Endpoints:');
    console.log(`  Start Charging: ${config.api_endpoints.charging.start ? '✅' : '❌'}`);
    console.log(`  Stop Charging:  ${config.api_endpoints.charging.stop ? '✅' : '❌'}`);
    console.log(`  Get Profile:    ${config.api_endpoints.charging.profile_get ? '✅' : '❌'}`);
    console.log(`  Set Profile:    ${config.api_endpoints.charging.profile_set ? '✅' : '❌'}`);
    
    console.log('\n🔐 Confirmation Required:');
    Object.entries(config.security.require_confirmation).forEach(([key, value]) => {
        if (value) {
            console.log(`  ${key}: ✅`);
        }
    });
    
    console.log('\n📊 Information Endpoints:');
    console.log(`  Status:        ${config.api_endpoints.status.get ? '✅' : '❌'}`);
    console.log(`  Location:      ${config.api_endpoints.location.get ? '✅' : '❌'}`);
    console.log(`  Diagnostics:   ${config.api_endpoints.diagnostics.get ? '✅' : '❌'}`);
}

// Enable/disable endpoint
function toggleEndpoint(category, action, enabled) {
    const config = loadConfig();
    
    if (!config.api_endpoints[category]) {
        console.error(`❌ Invalid category: ${category}`);
        return false;
    }
    
    if (config.api_endpoints[category][action] === undefined) {
        console.error(`❌ Invalid action: ${action} for category ${category}`);
        return false;
    }
    
    config.api_endpoints[category][action] = enabled;
    
    if (saveConfig(config)) {
        console.log(`✅ ${category}.${action} ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    }
    
    return false;
}

// Set confirmation requirement
function setConfirmation(action, required) {
    const config = loadConfig();
    config.security.require_confirmation[action] = required;
    
    if (saveConfig(config)) {
        console.log(`✅ Confirmation for ${action} ${required ? 'required' : 'not required'}`);
        return true;
    }
    
    return false;
}

// Preset configurations
function applyPreset(presetName) {
    const config = loadConfig();
    
    switch (presetName) {
        case 'safe':
            // Ultra-safe: disable all potentially dangerous endpoints
            config.api_endpoints.alert.lights = false;
            config.api_endpoints.alert.horn = false;
            config.api_endpoints.alert.both = false;
            config.api_endpoints.doors.unlock = false;
            config.api_endpoints.trunk.unlock = false;
            config.api_endpoints.charging.start = false;
            config.api_endpoints.charging.stop = false;
            console.log('🛡️  Applied SAFE preset');
            break;
            
        case 'balanced':
            // Balanced: enable most endpoints but require confirmation for risky ones
            config.api_endpoints.alert.lights = false;
            config.api_endpoints.alert.horn = false;
            config.api_endpoints.alert.both = false;
            config.api_endpoints.doors.unlock = true;
            config.api_endpoints.trunk.unlock = true;
            config.api_endpoints.charging.start = true;
            config.api_endpoints.charging.stop = true;
            
            config.security.require_confirmation.doors_unlock = true;
            config.security.require_confirmation.trunk_unlock = true;
            config.security.require_confirmation.charging_start = true;
            config.security.require_confirmation.charging_stop = true;
            console.log('⚖️  Applied BALANCED preset');
            break;
            
        case 'full':
            // Full access: enable everything (use with caution)
            Object.keys(config.api_endpoints).forEach(category => {
                Object.keys(config.api_endpoints[category]).forEach(action => {
                    config.api_endpoints[category][action] = true;
                });
            });
            console.log('🔓 Applied FULL ACCESS preset (use with caution!)');
            break;
            
        default:
            console.error(`❌ Unknown preset: ${presetName}`);
            console.log('Available presets: safe, balanced, full');
            return false;
    }
    
    return saveConfig(config);
}

// Main CLI interface
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🚗 Brandt Car API Configuration Manager\n');
        console.log('Usage:');
        console.log('  node config_manager.js show                    - Show current configuration');
        console.log('  node config_manager.js enable <category> <action>  - Enable endpoint');
        console.log('  node config_manager.js disable <category> <action> - Disable endpoint');
        console.log('  node config_manager.js confirm <action> <yes/no>   - Set confirmation requirement');
        console.log('  node config_manager.js preset <safe/balanced/full> - Apply preset configuration');
        console.log('  node config_manager.js reload                      - Reload server configuration');
        console.log('\nExamples:');
        console.log('  node config_manager.js disable alert lights       - Disable flash lights');
        console.log('  node config_manager.js enable doors unlock        - Enable door unlock');
        console.log('  node config_manager.js confirm doors_unlock yes   - Require confirmation for unlock');
        console.log('  node config_manager.js preset safe               - Apply safe configuration');
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'show':
            showConfig();
            break;
            
        case 'enable':
            if (args.length < 3) {
                console.error('❌ Usage: enable <category> <action>');
                return;
            }
            if (toggleEndpoint(args[1], args[2], true)) {
                reloadServerConfig();
            }
            break;
            
        case 'disable':
            if (args.length < 3) {
                console.error('❌ Usage: disable <category> <action>');
                return;
            }
            if (toggleEndpoint(args[1], args[2], false)) {
                reloadServerConfig();
            }
            break;
            
        case 'confirm':
            if (args.length < 3) {
                console.error('❌ Usage: confirm <action> <yes/no>');
                return;
            }
            const required = args[2].toLowerCase() === 'yes' || args[2].toLowerCase() === 'true';
            if (setConfirmation(args[1], required)) {
                reloadServerConfig();
            }
            break;
            
        case 'preset':
            if (args.length < 2) {
                console.error('❌ Usage: preset <safe/balanced/full>');
                return;
            }
            if (applyPreset(args[1])) {
                reloadServerConfig();
            }
            break;
            
        case 'reload':
            reloadServerConfig();
            break;
            
        default:
            console.error(`❌ Unknown command: ${command}`);
            console.log('Run without arguments to see usage help');
    }
}

if (require.main === module) {
    main();
}

module.exports = { loadConfig, saveConfig, toggleEndpoint, setConfirmation, applyPreset }; 