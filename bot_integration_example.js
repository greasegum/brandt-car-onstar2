#!/usr/bin/env node

/**
 * Bot Integration Example
 * Shows how a bot can use the /help endpoint to understand available commands
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080';
const API_KEY = 'brandt-car-boltaire-2025';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
};

class BrandtCarBot {
    constructor() {
        this.commands = [];
        this.safetyInfo = {};
    }

    // Load available commands from the help endpoint
    async loadCommands() {
        try {
            const response = await axios.get(`${API_BASE}/help`, { headers });
            const data = response.data.data;
            
            this.commands = data.commands;
            this.safetyInfo = data.safety_summary;
            
            console.log('✅ Bot loaded commands successfully');
            console.log(`   Total commands: ${this.safetyInfo.total_commands}`);
            console.log(`   Enabled: ${this.safetyInfo.enabled_commands}`);
            console.log(`   Disabled: ${this.safetyInfo.disabled_commands}`);
            console.log(`   Alert status: ${this.safetyInfo.alert_endpoints_status}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to load commands:', error.message);
            return false;
        }
    }

    // Check if a command is available and safe to use
    canExecuteCommand(commandName) {
        const command = this.commands.find(cmd => cmd.command === commandName);
        
        if (!command) {
            return {
                can_execute: false,
                reason: 'Command not found',
                suggestion: 'Use listCommands() to see available commands'
            };
        }

        if (!command.enabled) {
            return {
                can_execute: false,
                reason: command.disabled_reason || 'Command is disabled',
                suggestion: 'This command is disabled for safety reasons'
            };
        }

        if (command.safety_level === 'high_risk') {
            return {
                can_execute: false,
                reason: 'High risk command requires explicit user confirmation',
                warning: command.warning,
                suggestion: 'Ask user for explicit permission before executing'
            };
        }

        if (command.requires_confirmation) {
            return {
                can_execute: true,
                requires_confirmation: true,
                reason: 'Command requires confirmation parameter',
                suggestion: 'Add "confirm": true to the request body'
            };
        }

        return {
            can_execute: true,
            requires_confirmation: false,
            safety_level: command.safety_level
        };
    }

    // Get safe commands that can be executed without user confirmation
    getSafeCommands() {
        return this.commands.filter(cmd => 
            cmd.enabled && 
            cmd.safety_level === 'safe' && 
            !cmd.requires_confirmation
        );
    }

    // Get commands that need user confirmation
    getConfirmationCommands() {
        return this.commands.filter(cmd => 
            cmd.enabled && 
            cmd.requires_confirmation
        );
    }

    // Get disabled commands with reasons
    getDisabledCommands() {
        return this.commands.filter(cmd => !cmd.enabled);
    }

    // List all available commands with their status
    listCommands() {
        console.log('\n🤖 Bot Command Analysis:\n');
        
        const safeCommands = this.getSafeCommands();
        const confirmCommands = this.getConfirmationCommands();
        const disabledCommands = this.getDisabledCommands();
        
        console.log('🟢 SAFE COMMANDS (Can execute freely):');
        safeCommands.forEach(cmd => {
            console.log(`   • ${cmd.command} - ${cmd.description}`);
            console.log(`     └── ${cmd.example}`);
        });
        
        console.log('\n🟡 CONFIRMATION REQUIRED:');
        confirmCommands.forEach(cmd => {
            console.log(`   • ${cmd.command} - ${cmd.description}`);
            console.log(`     └── ${cmd.example}`);
        });
        
        console.log('\n🔴 DISABLED COMMANDS:');
        disabledCommands.forEach(cmd => {
            console.log(`   • ${cmd.command} - ${cmd.description}`);
            console.log(`     └── Reason: ${cmd.disabled_reason}`);
            if (cmd.warning) {
                console.log(`     └── Warning: ${cmd.warning}`);
            }
        });
    }

    // Execute a command with safety checks
    async executeCommand(commandName, parameters = {}) {
        const safety = this.canExecuteCommand(commandName);
        
        if (!safety.can_execute) {
            console.log(`❌ Cannot execute ${commandName}: ${safety.reason}`);
            if (safety.suggestion) {
                console.log(`   💡 ${safety.suggestion}`);
            }
            return false;
        }

        const command = this.commands.find(cmd => cmd.command === commandName);
        
        // Add confirmation if required
        if (safety.requires_confirmation && !parameters.confirm) {
            console.log(`🔐 ${commandName} requires confirmation`);
            console.log(`   💡 ${safety.suggestion}`);
            parameters.confirm = true;
        }

        try {
            console.log(`🚀 Executing ${commandName}...`);
            
            const method = command.endpoint.split(' ')[0].toLowerCase();
            const endpoint = command.endpoint.split(' ')[1];
            
            const config = {
                method,
                url: `${API_BASE}${endpoint}`,
                headers
            };
            
            if (method === 'post' && Object.keys(parameters).length > 0) {
                config.data = parameters;
            }
            
            const response = await axios(config);
            
            console.log(`✅ ${commandName} executed successfully`);
            console.log(`   Response: ${response.data.message}`);
            
            return response.data;
            
        } catch (error) {
            console.error(`❌ Failed to execute ${commandName}:`, error.response?.data?.message || error.message);
            return false;
        }
    }
}

// Example usage
async function demonstrateBot() {
    console.log('🤖 Brandt Car Bot Integration Example\n');
    
    const bot = new BrandtCarBot();
    
    // Load commands from API
    const loaded = await bot.loadCommands();
    if (!loaded) {
        console.log('❌ Cannot proceed without command information');
        return;
    }
    
    // Show command analysis
    bot.listCommands();
    
    // Test safe command
    console.log('\n🧪 Testing Safe Command:');
    const statusResult = await bot.executeCommand('get_status');
    
    // Test command that requires confirmation
    console.log('\n🧪 Testing Confirmation Command:');
    const unlockResult = await bot.executeCommand('unlock_doors');
    
    // Test disabled command
    console.log('\n🧪 Testing Disabled Command:');
    const flashResult = await bot.executeCommand('flash_lights');
    
    // Show safety check example
    console.log('\n🔍 Safety Check Examples:');
    
    const commands = ['get_status', 'unlock_doors', 'flash_lights', 'nonexistent_command'];
    
    commands.forEach(cmd => {
        const safety = bot.canExecuteCommand(cmd);
        console.log(`\n${cmd}:`);
        console.log(`   Can execute: ${safety.can_execute}`);
        console.log(`   Reason: ${safety.reason || 'Safe to execute'}`);
        if (safety.warning) {
            console.log(`   Warning: ${safety.warning}`);
        }
        if (safety.suggestion) {
            console.log(`   Suggestion: ${safety.suggestion}`);
        }
    });
}

// Check if server is running
async function checkServer() {
    try {
        const response = await axios.get(`${API_BASE}/health`);
        return true;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔍 Checking if server is running...');
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   node server.js');
        process.exit(1);
    }
    
    console.log('✅ Server is running\n');
    await demonstrateBot();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { BrandtCarBot }; 