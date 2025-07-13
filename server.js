/**
 * Brandt Car API - Node.js Express Server
 * REST API for controlling 2020 Chevrolet Bolt EV via OnStar
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import existing OnStar functionality
const OnStar = require('onstarjs2');
const _ = require('lodash');

// Import database module
const db = require('./database');

// Import session manager
const sessionManager = require('./session_manager');

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load config.json:', error.message);
    console.log('Using default configuration...');
    config = {
        api_endpoints: {
            climate: { start: true, stop: true },
            doors: { lock: true, unlock: true },
            trunk: { lock: true, unlock: true },
            alert: { lights: false, horn: false, both: false, cancel: true },
            status: { get: true },
            location: { get: true },
            diagnostics: { get: true },
            charging: { start: true, stop: true, profile_get: true, profile_set: true },
            system: { health: true, capabilities: true }
        },
        security: {
            require_confirmation: {},
            rate_limiting: {}
        },
        logging: { log_all_requests: false, log_disabled_attempts: true },
        notifications: {
            disabled_endpoint_message: "This endpoint has been disabled for safety reasons.",
            confirmation_required_message: "This action requires confirmation. Add 'confirm=true' to your request body."
        }
    };
}

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// API Key authentication
const API_KEY = process.env.API_KEY || 'brandt-car-boltaire-2025';

function authenticateApiKey(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'API key required',
            timestamp: new Date().toISOString()
        });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Invalid authorization header',
            timestamp: new Date().toISOString()
        });
    }
    
    const apiKey = authHeader.replace('Bearer ', '');
    if (apiKey !== API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Invalid API key',
            timestamp: new Date().toISOString()
        });
    }
    
    next();
}

// Endpoint availability middleware
function checkEndpointEnabled(category, action) {
    return (req, res, next) => {
        const isEnabled = config.api_endpoints[category] && config.api_endpoints[category][action];
        
        if (!isEnabled) {
            // Log disabled attempt if configured
            if (config.logging && config.logging.log_disabled_attempts) {
                console.log(`[DISABLED] ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
                logToFile(`[DISABLED] ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
            }
            
            return res.status(403).json(createResponse(false, 
                config.notifications.disabled_endpoint_message, 
                {
                    endpoint: `${category}.${action}`,
                    enabled: false,
                    config_file: 'config.json'
                }
            ));
        }
        
        next();
    };
}

// Confirmation required middleware
function requireConfirmation(actionKey) {
    return (req, res, next) => {
        const requiresConfirmation = config.security.require_confirmation[actionKey];
        
        if (requiresConfirmation && !req.body.confirm) {
            return res.status(400).json(createResponse(false, 
                config.notifications.confirmation_required_message,
                {
                    action: actionKey,
                    requires_confirmation: true,
                    hint: "Add 'confirm: true' to your request body to proceed"
                }
            ));
        }
        
        next();
    };
}

// Logging function
function logToFile(message) {
    if (config.logging && config.logging.log_file) {
        try {
            const logDir = path.dirname(config.logging.log_file);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.appendFileSync(config.logging.log_file, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }
}

// Request logging middleware
function logRequest(req, res, next) {
    if (config.logging && config.logging.log_all_requests) {
        const logMessage = `[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`;
        console.log(logMessage);
        logToFile(logMessage);
    }
    next();
}

// Apply request logging
app.use(logRequest);

// Session monitoring middleware
app.use((req, res, next) => {
    // Add session info to all responses
    const originalSend = res.send;
    res.send = function(data) {
        try {
            const responseData = JSON.parse(data);
            if (responseData && typeof responseData === 'object' && responseData.data) {
                // Add session summary to all API responses
                const sessionSummary = sessionManager.getSessionSummary();
                responseData.data.session = sessionSummary;
            }
            originalSend.call(this, JSON.stringify(responseData));
        } catch (error) {
            // If parsing fails, send original data
            originalSend.call(this, data);
        }
    };
    next();
});

// Database logging middleware
app.use(async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Override res.send to capture response
    res.send = function(data) {
        const executionTime = Date.now() - startTime;
        
        // Log the request/response
        db.logApiRequest({
            endpoint: req.path,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            apiKey: req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null,
            requestBody: req.method === 'POST' || req.method === 'PUT' ? req.body : null,
            responseStatus: res.statusCode,
            responseBody: data,
            executionTime,
            success: res.statusCode < 400,
            errorMessage: res.statusCode >= 400 ? data : null,
            vehicleVin: process.env.ONSTAR_VIN,
            commandType: getCommandType(req.path),
            safetyLevel: getSafetyLevel(req.path),
            requiresConfirmation: requiresConfirmation(req.path),
            confirmationProvided: req.body && req.body.confirm === true,
            environment: process.env.RAILWAY_ENVIRONMENT || 'development',
            deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || 'local'
        }).catch(err => {
            console.error('Failed to log request:', err.message);
        });
        
        originalSend.call(this, data);
    };
    
    next();
});

// Helper function to determine command type
function getCommandType(path) {
    if (path.startsWith('/climate')) return 'climate_control';
    if (path.startsWith('/doors')) return 'door_control';
    if (path.startsWith('/trunk')) return 'trunk_control';
    if (path.startsWith('/alert')) return 'alert';
    if (path.startsWith('/charging')) return 'charging';
    if (path.startsWith('/status') || path.startsWith('/location') || path.startsWith('/diagnostics')) return 'information';
    if (path.startsWith('/health') || path.startsWith('/help') || path.startsWith('/contract')) return 'system';
    return 'unknown';
}

// Helper function to determine safety level
function getSafetyLevel(path) {
    if (path.startsWith('/alert')) return 'high_risk';
    if (path.includes('unlock') || path.startsWith('/charging')) return 'medium';
    return 'safe';
}

// Helper function to check if confirmation is required
function requiresConfirmation(path) {
    return path.includes('unlock') || path.startsWith('/alert') || path.startsWith('/charging');
}



// Helper function for API responses
function createResponse(success, message, data = null) {
    return {
        success,
        message,
        timestamp: new Date().toISOString(),
        data
    };
}



// Helper function to execute OnStar commands with session management
async function executeSessionCommand(commandName, commandFunc) {
    try {
        const result = await sessionManager.executeCommand(commandName, commandFunc);
        return result;
    } catch (error) {
        console.error(`Session command ${commandName} failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// SESSION MANAGEMENT ENDPOINTS

// POST /auth/session - Initialize authentication session
app.post('/auth/session', authenticateApiKey, async (req, res) => {
    try {
        console.log('🔐 Session authentication requested');
        
        // Check if authentication is already in progress
        const currentStatus = sessionManager.getSessionStatus();
        if (currentStatus.authenticationInProgress) {
            return res.status(202).json(createResponse(true, 'Authentication already in progress', {
                sessionId: currentStatus.sessionId,
                status: 'authenticating',
                message: 'Please wait for authentication to complete'
            }));
        }
        
        // Check if session is already active and not expired
        if (currentStatus.isAuthenticated && !currentStatus.isExpired) {
            return res.json(createResponse(true, 'Session already active', {
                sessionId: currentStatus.sessionId,
                status: 'ready',
                expiresAt: currentStatus.tokenExpiry,
                timeToExpiry: currentStatus.timeToExpiry,
                message: 'Session is already authenticated and ready for commands'
            }));
        }
        
        // Start authentication
        const authResult = await sessionManager.authenticate();
        
        res.json(createResponse(true, 'Authentication successful', {
            sessionId: authResult.sessionId,
            status: 'ready',
            expiresAt: authResult.expiresAt,
            vehicleCount: authResult.vehicleCount,
            message: authResult.message
        }));
        
    } catch (error) {
        console.error('Session authentication failed:', error);
        res.status(500).json(createResponse(false, `Session authentication failed: ${error.message}`, {
            status: 'error',
            details: error.message
        }));
    }
});

// GET /auth/status - Check session status
app.get('/auth/status', authenticateApiKey, async (req, res) => {
    try {
        const status = sessionManager.getSessionStatus();
        const summary = sessionManager.getSessionSummary();
        
        res.json(createResponse(true, 'Session status retrieved', {
            session: summary,
            details: {
                sessionId: status.sessionId,
                authenticated: status.isAuthenticated,
                expired: status.isExpired,
                expiringSoon: status.isExpiringSoon,
                authInProgress: status.authenticationInProgress,
                lastAuthTime: status.lastAuthTime,
                tokenExpiry: status.tokenExpiry,
                timeToExpiry: status.timeToExpiry,
                lastError: status.lastError,
                vehicleCount: status.vehicleCount,
                hasStoredTokens: sessionManager.hasStoredTokens()
            }
        }));
    } catch (error) {
        console.error('Session status check failed:', error);
        res.status(500).json(createResponse(false, `Session status check failed: ${error.message}`));
    }
});

// DELETE /auth/session - Clear session and tokens
app.delete('/auth/session', authenticateApiKey, async (req, res) => {
    try {
        await sessionManager.clearSession();
        res.json(createResponse(true, 'Session cleared successfully', {
            status: 'cleared',
            message: 'Session and tokens have been cleared'
        }));
    } catch (error) {
        console.error('Session clear failed:', error);
        res.status(500).json(createResponse(false, `Session clear failed: ${error.message}`));
    }
});

// Vehicle Control Endpoints

// POST /climate/start
app.post('/climate/start', authenticateApiKey, checkEndpointEnabled('climate', 'start'), requireConfirmation('climate_start'), async (req, res) => {
    try {
        const { duration_minutes = 10, force = false, temperature } = req.body;
        
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'climate_start',
            (client) => client.start()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to start climate: ${error}`));
        }
        
        res.json(createResponse(true, 'Climate preconditioning started', {
            duration_minutes,
            command_id: `cmd_${Date.now()}`,
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Climate start failed:', error);
        res.status(500).json(createResponse(false, `Failed to start climate: ${error.message}`));
    }
});

// POST /climate/stop
app.post('/climate/stop', authenticateApiKey, checkEndpointEnabled('climate', 'stop'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'climate_stop',
            (client) => client.cancelStart()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to stop climate: ${error}`));
        }
        
        res.json(createResponse(true, 'Climate preconditioning stopped', {
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Climate stop failed:', error);
        res.status(500).json(createResponse(false, `Failed to stop climate: ${error.message}`));
    }
});

// POST /doors/lock
app.post('/doors/lock', authenticateApiKey, checkEndpointEnabled('doors', 'lock'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'doors_lock',
            (client) => client.lockDoor()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to lock doors: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle doors locked', {
            action: 'locked',
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Door lock failed:', error);
        res.status(500).json(createResponse(false, `Failed to lock doors: ${error.message}`));
    }
});

// POST /doors/unlock
app.post('/doors/unlock', authenticateApiKey, checkEndpointEnabled('doors', 'unlock'), requireConfirmation('doors_unlock'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'doors_unlock',
            (client) => client.unlockDoor()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to unlock doors: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle doors unlocked', {
            action: 'unlocked',
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Door unlock failed:', error);
        res.status(500).json(createResponse(false, `Failed to unlock doors: ${error.message}`));
    }
});

// POST /trunk/lock
app.post('/trunk/lock', authenticateApiKey, checkEndpointEnabled('trunk', 'lock'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'trunk_lock',
            (client) => client.lockTrunk()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to lock trunk: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle trunk locked', {
            action: 'trunk_locked',
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Trunk lock failed:', error);
        res.status(500).json(createResponse(false, `Failed to lock trunk: ${error.message}`));
    }
});

// POST /trunk/unlock
app.post('/trunk/unlock', authenticateApiKey, checkEndpointEnabled('trunk', 'unlock'), requireConfirmation('trunk_unlock'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'trunk_unlock',
            (client) => client.unlockTrunk()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to unlock trunk: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle trunk unlocked', {
            action: 'trunk_unlocked',
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Trunk unlock failed:', error);
        res.status(500).json(createResponse(false, `Failed to unlock trunk: ${error.message}`));
    }
});

// POST /alert/lights
app.post('/alert/lights', authenticateApiKey, checkEndpointEnabled('alert', 'lights'), requireConfirmation('alert_lights'), async (req, res) => {
    try {
        const { duration_seconds = 30 } = req.body;
        
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'alert_lights',
            (client) => client.alert({
                action: ['Flash'],
                duration: duration_seconds
            })
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to activate lights: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle lights activated', {
            duration_seconds,
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Light alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to activate lights: ${error.message}`));
    }
});

// POST /alert/horn
app.post('/alert/horn', authenticateApiKey, checkEndpointEnabled('alert', 'horn'), requireConfirmation('alert_horn'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'alert_horn',
            (client) => client.alert({
                action: ['Honk']
            })
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to activate horn: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle horn activated', {
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Horn alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to activate horn: ${error.message}`));
    }
});

// POST /alert/both
app.post('/alert/both', authenticateApiKey, checkEndpointEnabled('alert', 'both'), requireConfirmation('alert_both'), async (req, res) => {
    try {
        const { duration_seconds = 30 } = req.body;
        
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'alert_both',
            (client) => client.alert({
                action: ['Flash', 'Honk'],
                duration: duration_seconds
            })
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to activate alerts: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle lights and horn activated', {
            duration_seconds,
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Combined alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to activate alerts: ${error.message}`));
    }
});

// POST /alert/cancel
app.post('/alert/cancel', authenticateApiKey, checkEndpointEnabled('alert', 'cancel'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'alert_cancel',
            (client) => client.cancelAlert()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to cancel alerts: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle alerts cancelled', {
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Cancel alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to cancel alerts: ${error.message}`));
    }
});

// Vehicle Information Endpoints

// GET /status
app.get('/status', authenticateApiKey, checkEndpointEnabled('status', 'get'), async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Use session-based command execution for diagnostics
        const diagnosticsCommand = await executeSessionCommand(
            'get_diagnostics',
            (client) => client.diagnostics({
                diagnosticItem: [
                    'EV BATTERY LEVEL',
                    'EV RANGE',
                    'ODOMETER',
                    'TIRE PRESSURE',
                    'AMBIENT AIR TEMPERATURE',
                    'EV CHARGE STATE',
                    'EV PLUG STATE'
                ]
            })
        );
        
        // Use session-based command execution for location
        const locationCommand = await executeSessionCommand(
            'get_location',
            (client) => client.location()
        );
        
        // Check if either command failed due to session issues
        if (!diagnosticsCommand.success || !locationCommand.success) {
            const error = diagnosticsCommand.error || locationCommand.error;
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to get vehicle status: ${error}`));
        }
        
        // Parse diagnostics
        const diagnostics = diagnosticsCommand.result.response.data.commandResponse.body.diagnosticResponse;
        const vehicleData = parseDiagnostics(diagnostics);
        
        // Parse location
        const locationData = locationCommand.result.response.data.commandResponse.body;
        
        const totalTime = Date.now() - startTime;
        
        res.json(createResponse(true, 'Vehicle status retrieved', {
            vehicle_data: {
                battery: {
                    level: vehicleData['EV BATTERY LEVEL'],
                    range_miles: vehicleData['EV RANGE'],
                    charging_status: vehicleData['EV CHARGE STATE'],
                    plug_state: vehicleData['EV PLUG STATE']
                },
                vehicle: {
                    odometer: vehicleData['ODOMETER'],
                    tire_pressure: vehicleData['TIRE PRESSURE'],
                    ambient_temp: vehicleData['AMBIENT AIR TEMPERATURE']
                },
                location: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    speed_mph: locationData.speed || 0
                }
            },
            execution_time_ms: totalTime,
            commands_executed: ['get_diagnostics', 'get_location']
        }));
    } catch (error) {
        console.error('Status retrieval failed:', error);
        res.status(500).json(createResponse(false, `Failed to get vehicle status: ${error.message}`));
    }
});

// GET /location
app.get('/location', authenticateApiKey, checkEndpointEnabled('location', 'get'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'get_location',
            (client) => client.location()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to get location: ${error}`));
        }
        
        const location = result.response.data.commandResponse.body;
        
        res.json(createResponse(true, 'Vehicle location retrieved', {
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy_meters: 10,
                speed_mph: location.speed || 0,
                heading: location.heading || 0
            },
            execution_time_ms: executionTime
        }));
    } catch (error) {
        console.error('Location retrieval failed:', error);
        res.status(500).json(createResponse(false, `Failed to get vehicle location: ${error.message}`));
    }
});

// GET /diagnostics
app.get('/diagnostics', authenticateApiKey, checkEndpointEnabled('diagnostics', 'get'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'get_diagnostics',
            (client) => client.diagnostics()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to get diagnostics: ${error}`));
        }
        
        const diagnostics = result.response.data.commandResponse.body.diagnosticResponse;
        const vehicleData = parseDiagnostics(diagnostics);
        
        res.json(createResponse(true, 'Vehicle diagnostics retrieved', {
            diagnostics: vehicleData,
            execution_time_ms: executionTime
        }));
    } catch (error) {
        console.error('Diagnostics retrieval failed:', error);
        res.status(500).json(createResponse(false, `Failed to get diagnostics: ${error.message}`));
    }
});

// EV-Specific Endpoints

// POST /charging/start
app.post('/charging/start', authenticateApiKey, checkEndpointEnabled('charging', 'start'), requireConfirmation('charging_start'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'charging_start',
            (client) => client.chargeOverride({ mode: 'CHARGE_NOW' })
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to start charging: ${error}`));
        }
        
        res.json(createResponse(true, 'Charging started', {
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Start charging failed:', error);
        res.status(500).json(createResponse(false, `Failed to start charging: ${error.message}`));
    }
});

// POST /charging/stop
app.post('/charging/stop', authenticateApiKey, checkEndpointEnabled('charging', 'stop'), requireConfirmation('charging_stop'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'charging_stop',
            (client) => client.chargeOverride({ mode: 'STOP_CHARGING' })
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to stop charging: ${error}`));
        }
        
        res.json(createResponse(true, 'Charging stopped', {
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Stop charging failed:', error);
        res.status(500).json(createResponse(false, `Failed to stop charging: ${error.message}`));
    }
});

// GET /charging/profile
app.get('/charging/profile', authenticateApiKey, checkEndpointEnabled('charging', 'profile_get'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'get_charging_profile',
            (client) => client.getChargingProfile()
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to get charge profile: ${error}`));
        }
        
        const profile = result.response.data.commandResponse.body;
        
        res.json(createResponse(true, 'Charging profile retrieved', {
            profile,
            execution_time_ms: executionTime
        }));
    } catch (error) {
        console.error('Get charge profile failed:', error);
        res.status(500).json(createResponse(false, `Failed to get charging profile: ${error.message}`));
    }
});

// POST /charging/profile
app.post('/charging/profile', authenticateApiKey, checkEndpointEnabled('charging', 'profile_set'), async (req, res) => {
    try {
        const { scheduled_start = '23:00', target_level = 90, rate_limit = 'normal' } = req.body;
        
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'set_charging_profile',
            (client) => client.setChargingProfile({
                chargeMode: 'SCHEDULED',
                rateType: rate_limit.toUpperCase()
            })
        );
        
        if (!success) {
            // Check if error is due to session issues
            if (error.includes('session') || error.includes('authenticate')) {
                return res.status(401).json(createResponse(false, `Session required: ${error}`, {
                    action: 'authenticate',
                    endpoint: '/auth/session',
                    hint: 'Please authenticate first using POST /auth/session'
                }));
            }
            return res.status(500).json(createResponse(false, `Failed to set charge profile: ${error}`));
        }
        
        res.json(createResponse(true, 'Charging profile updated', {
            scheduled_start,
            target_level,
            rate_limit,
            execution_time_ms: executionTime,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Set charge profile failed:', error);
        res.status(500).json(createResponse(false, `Failed to set charging profile: ${error.message}`));
    }
});

// System Endpoints

// GET /health
app.get('/health', checkEndpointEnabled('system', 'health'), async (req, res) => {
    try {
        // Use session-based command execution
        const { success, result, error, executionTime } = await executeSessionCommand(
            'health_check',
            (client) => client.getAccountVehicles()
        );
        
        if (success) {
            res.json(createResponse(true, 'System healthy', {
                status: 'healthy',
                service: 'brandt-car-api-v2',
                version: '2.1.0',
                onstar_connection: {
                    authenticated: true,
                    last_successful_call: new Date().toISOString()
                },
                execution_time_ms: executionTime
            }));
        } else {
            res.json(createResponse(false, 'System unhealthy', {
                status: 'unhealthy',
                error
            }));
        }
    } catch (error) {
        console.error('Health check failed:', error);
        res.json(createResponse(false, 'System unhealthy', {
            status: 'unhealthy',
            error: error.message
        }));
    }
});

// GET /capabilities
app.get('/capabilities', authenticateApiKey, checkEndpointEnabled('system', 'capabilities'), async (req, res) => {
    res.json(createResponse(true, 'Vehicle capabilities retrieved', {
        vehicle_info: {
            make: 'Chevrolet',
            model: 'Bolt EV',
            year: 2020,
            vin: process.env.ONSTAR_VIN
        },
        supported_commands: [
            'start', 'stop', 'lockDoor', 'unlockDoor', 
            'lockTrunk', 'unlockTrunk', 'alert', 'cancelAlert',
            'getLocation', 'getDiagnostics', 'setChargeProfile'
        ],
        limitations: {
            rate_limit_minutes: 30,
            hibernation_mode: '4-5 requests after engine off'
        },
        configuration: {
            endpoints_enabled: config.api_endpoints,
            security_settings: {
                confirmation_required: config.security.require_confirmation,
                rate_limiting: config.security.rate_limiting
            },
            config_file: 'config.json'
        }
    }));
});

// GET /help - Dynamic help endpoint for bot integration
app.get('/help', async (req, res) => {
    const helpData = generateHelpData();
    res.json(createResponse(true, 'Available commands and safety status', helpData));
});

// GET /contract - API contract document for bot integration
app.get('/contract', async (req, res) => {
    const contractData = generateApiContract();
    res.json(createResponse(true, 'API contract for bot integration', contractData));
});

// Helper function to generate dynamic help data
function generateHelpData() {
    const commands = [];
    
    // Climate Control Commands
    if (config.api_endpoints.climate.start) {
        commands.push({
            command: 'start_climate',
            endpoint: 'POST /climate/start',
            description: 'Start climate preconditioning (heating/cooling)',
            parameters: {
                duration_minutes: 'number (optional, default: 10)',
                temperature: 'number (optional)'
            },
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.climate_start || false,
            example: 'Start climate for 15 minutes: POST /climate/start {"duration_minutes": 15}'
        });
    }
    
    if (config.api_endpoints.climate.stop) {
        commands.push({
            command: 'stop_climate',
            endpoint: 'POST /climate/stop',
            description: 'Stop climate preconditioning',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Stop climate: POST /climate/stop'
        });
    }
    
    // Door Control Commands
    if (config.api_endpoints.doors.lock) {
        commands.push({
            command: 'lock_doors',
            endpoint: 'POST /doors/lock',
            description: 'Lock all vehicle doors',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Lock doors: POST /doors/lock'
        });
    }
    
    if (config.api_endpoints.doors.unlock) {
        commands.push({
            command: 'unlock_doors',
            endpoint: 'POST /doors/unlock',
            description: 'Unlock all vehicle doors',
            parameters: {
                confirm: 'boolean (required if confirmation enabled)'
            },
            safety_level: 'medium',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.doors_unlock || false,
            example: 'Unlock doors: POST /doors/unlock {"confirm": true}'
        });
    } else {
        commands.push({
            command: 'unlock_doors',
            endpoint: 'POST /doors/unlock',
            description: 'Unlock all vehicle doors',
            parameters: {},
            safety_level: 'medium',
            enabled: false,
            disabled_reason: 'Disabled for security - can be enabled in config.json',
            example: 'Currently disabled'
        });
    }
    
    // Trunk Control Commands
    if (config.api_endpoints.trunk.lock) {
        commands.push({
            command: 'lock_trunk',
            endpoint: 'POST /trunk/lock',
            description: 'Lock vehicle trunk',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Lock trunk: POST /trunk/lock'
        });
    }
    
    if (config.api_endpoints.trunk.unlock) {
        commands.push({
            command: 'unlock_trunk',
            endpoint: 'POST /trunk/unlock',
            description: 'Unlock vehicle trunk',
            parameters: {
                confirm: 'boolean (required if confirmation enabled)'
            },
            safety_level: 'medium',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.trunk_unlock || false,
            example: 'Unlock trunk: POST /trunk/unlock {"confirm": true}'
        });
    } else {
        commands.push({
            command: 'unlock_trunk',
            endpoint: 'POST /trunk/unlock',
            description: 'Unlock vehicle trunk',
            parameters: {},
            safety_level: 'medium',
            enabled: false,
            disabled_reason: 'Disabled for security - can be enabled in config.json',
            example: 'Currently disabled'
        });
    }
    
    // Alert Commands (potentially dangerous)
    if (config.api_endpoints.alert.lights) {
        commands.push({
            command: 'flash_lights',
            endpoint: 'POST /alert/lights',
            description: 'Flash vehicle lights (WARNING: May trigger car alarm)',
            parameters: {
                duration_seconds: 'number (optional, default: 30)',
                confirm: 'boolean (required if confirmation enabled)'
            },
            safety_level: 'high_risk',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.alert_lights || false,
            warning: 'This may trigger the car alarm and disturb neighbors',
            example: 'Flash lights: POST /alert/lights {"duration_seconds": 10, "confirm": true}'
        });
    } else {
        commands.push({
            command: 'flash_lights',
            endpoint: 'POST /alert/lights',
            description: 'Flash vehicle lights',
            parameters: {},
            safety_level: 'high_risk',
            enabled: false,
            disabled_reason: 'Disabled for safety - triggers car alarm',
            warning: 'This command is disabled by default because it triggers the car alarm',
            example: 'Currently disabled for safety'
        });
    }
    
    if (config.api_endpoints.alert.horn) {
        commands.push({
            command: 'honk_horn',
            endpoint: 'POST /alert/horn',
            description: 'Activate vehicle horn (WARNING: Loud noise)',
            parameters: {
                confirm: 'boolean (required if confirmation enabled)'
            },
            safety_level: 'high_risk',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.alert_horn || false,
            warning: 'This will make a loud noise and may disturb neighbors',
            example: 'Honk horn: POST /alert/horn {"confirm": true}'
        });
    } else {
        commands.push({
            command: 'honk_horn',
            endpoint: 'POST /alert/horn',
            description: 'Activate vehicle horn',
            parameters: {},
            safety_level: 'high_risk',
            enabled: false,
            disabled_reason: 'Disabled for safety - loud noise disturbance',
            warning: 'This command is disabled by default to prevent noise disturbance',
            example: 'Currently disabled for safety'
        });
    }
    
    if (config.api_endpoints.alert.both) {
        commands.push({
            command: 'alert_both',
            endpoint: 'POST /alert/both',
            description: 'Activate both lights and horn (WARNING: Very disruptive)',
            parameters: {
                duration_seconds: 'number (optional, default: 30)',
                confirm: 'boolean (required if confirmation enabled)'
            },
            safety_level: 'high_risk',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.alert_both || false,
            warning: 'This will trigger car alarm AND make loud noise',
            example: 'Alert both: POST /alert/both {"duration_seconds": 10, "confirm": true}'
        });
    } else {
        commands.push({
            command: 'alert_both',
            endpoint: 'POST /alert/both',
            description: 'Activate both lights and horn',
            parameters: {},
            safety_level: 'high_risk',
            enabled: false,
            disabled_reason: 'Disabled for safety - very disruptive',
            warning: 'This command is disabled by default due to extreme disruption',
            example: 'Currently disabled for safety'
        });
    }
    
    if (config.api_endpoints.alert.cancel) {
        commands.push({
            command: 'cancel_alert',
            endpoint: 'POST /alert/cancel',
            description: 'Cancel any active alerts (lights/horn)',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Cancel alerts: POST /alert/cancel'
        });
    }
    
    // Charging Commands
    if (config.api_endpoints.charging.start) {
        commands.push({
            command: 'start_charging',
            endpoint: 'POST /charging/start',
            description: 'Start vehicle charging immediately',
            parameters: {
                confirm: 'boolean (required if confirmation enabled)'
            },
            safety_level: 'medium',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.charging_start || false,
            example: 'Start charging: POST /charging/start {"confirm": true}'
        });
    } else {
        commands.push({
            command: 'start_charging',
            endpoint: 'POST /charging/start',
            description: 'Start vehicle charging immediately',
            parameters: {},
            safety_level: 'medium',
            enabled: false,
            disabled_reason: 'Disabled - may affect planned charging schedule',
            example: 'Currently disabled'
        });
    }
    
    if (config.api_endpoints.charging.stop) {
        commands.push({
            command: 'stop_charging',
            endpoint: 'POST /charging/stop',
            description: 'Stop vehicle charging',
            parameters: {
                confirm: 'boolean (required if confirmation enabled)'
            },
            safety_level: 'medium',
            enabled: true,
            requires_confirmation: config.security.require_confirmation.charging_stop || false,
            example: 'Stop charging: POST /charging/stop {"confirm": true}'
        });
    } else {
        commands.push({
            command: 'stop_charging',
            endpoint: 'POST /charging/stop',
            description: 'Stop vehicle charging',
            parameters: {},
            safety_level: 'medium',
            enabled: false,
            disabled_reason: 'Disabled - may interrupt important charging',
            example: 'Currently disabled'
        });
    }
    
    // Information Commands (always safe)
    if (config.api_endpoints.status.get) {
        commands.push({
            command: 'get_status',
            endpoint: 'GET /status',
            description: 'Get complete vehicle status (battery, location, diagnostics)',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Get status: GET /status'
        });
    }
    
    if (config.api_endpoints.location.get) {
        commands.push({
            command: 'get_location',
            endpoint: 'GET /location',
            description: 'Get current vehicle location',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Get location: GET /location'
        });
    }
    
    if (config.api_endpoints.diagnostics.get) {
        commands.push({
            command: 'get_diagnostics',
            endpoint: 'GET /diagnostics',
            description: 'Get vehicle diagnostic information',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Get diagnostics: GET /diagnostics'
        });
    }
    
    if (config.api_endpoints.charging.profile_get) {
        commands.push({
            command: 'get_charging_profile',
            endpoint: 'GET /charging/profile',
            description: 'Get current charging profile/schedule',
            parameters: {},
            safety_level: 'safe',
            enabled: true,
            requires_confirmation: false,
            example: 'Get charging profile: GET /charging/profile'
        });
    }
    
    if (config.api_endpoints.charging.profile_set) {
        commands.push({
            command: 'set_charging_profile',
            endpoint: 'POST /charging/profile',
            description: 'Set charging profile/schedule',
            parameters: {
                scheduled_start: 'string (optional, default: "23:00")',
                target_level: 'number (optional, default: 90)',
                rate_limit: 'string (optional, default: "normal")'
            },
            safety_level: 'medium',
            enabled: true,
            requires_confirmation: false,
            example: 'Set profile: POST /charging/profile {"scheduled_start": "22:00", "target_level": 80}'
        });
    }
    
    // System Commands
    commands.push({
        command: 'health_check',
        endpoint: 'GET /health',
        description: 'Check API and OnStar connection health',
        parameters: {},
        safety_level: 'safe',
        enabled: true,
        requires_confirmation: false,
        example: 'Health check: GET /health'
    });
    
    // Count commands by safety level
    const safetyStats = {
        safe: commands.filter(cmd => cmd.safety_level === 'safe').length,
        medium: commands.filter(cmd => cmd.safety_level === 'medium').length,
        high_risk: commands.filter(cmd => cmd.safety_level === 'high_risk').length,
        enabled: commands.filter(cmd => cmd.enabled).length,
        disabled: commands.filter(cmd => !cmd.enabled).length,
        require_confirmation: commands.filter(cmd => cmd.requires_confirmation).length
    };
    
    return {
        vehicle_info: {
            make: 'Chevrolet',
            model: 'Bolt EV',
            year: 2020,
            vin: process.env.ONSTAR_VIN
        },
        api_info: {
            base_url: process.env.API_BASE_URL || 'http://localhost:8080',
            authentication: 'Bearer token required in Authorization header',
            api_key: 'Set API_KEY environment variable (default: brandt-car-boltaire-2025)'
        },
        environment_status: checkEnvironmentStatus(),
        safety_summary: {
            total_commands: commands.length,
            enabled_commands: safetyStats.enabled,
            disabled_commands: safetyStats.disabled,
            safe_commands: safetyStats.safe,
            medium_risk_commands: safetyStats.medium,
            high_risk_commands: safetyStats.high_risk,
            confirmation_required: safetyStats.require_confirmation,
            alert_endpoints_status: config.api_endpoints.alert.lights ? 'ENABLED (CAUTION)' : 'DISABLED (SAFE)'
        },
        commands: commands,
        safety_notes: [
            'Commands marked as "high_risk" are disabled by default for safety',
            'Alert commands (lights/horn) may trigger car alarm and disturb neighbors',
            'Commands requiring confirmation need "confirm": true in request body',
            'All commands require valid API key in Authorization header',
            'Vehicle must be awake for commands to work (may take 30+ seconds if sleeping)'
        ],
        bot_integration_tips: [
            'Check "enabled" field before attempting to use a command',
            'Respect "requires_confirmation" field and prompt user if needed',
            'Use "safety_level" to determine if user confirmation is appropriate',
            'Monitor "disabled_reason" to explain why commands are unavailable',
            'Always check the "warning" field for high-risk commands'
        ]
    };
}

// Helper function to check environment status (Railway variables)
function checkEnvironmentStatus() {
    const requiredVars = [
        'ONSTAR_USERNAME',
        'ONSTAR_PASSWORD', 
        'ONSTAR_PIN',
        'ONSTAR_VIN',
        'ONSTAR_DEVICEID',
        'ONSTAR_TOTP_SECRET'
    ];
    
    const optionalVars = [
        'API_KEY',
        'ONSTAR_TOKEN_LOCATION',
        'ONSTAR_REFRESH',
        'ONSTAR_TIMEOUT',
        'LOG_LEVEL',
        'CACHE_TTL'
    ];
    
    const railwayVars = [
        'RAILWAY_ENVIRONMENT',
        'RAILWAY_PROJECT_ID',
        'RAILWAY_SERVICE_ID',
        'RAILWAY_DEPLOYMENT_ID',
        'RAILWAY_REPLICA_ID',
        'RAILWAY_GIT_COMMIT_SHA',
        'RAILWAY_GIT_BRANCH',
        'RAILWAY_GIT_REPO_NAME',
        'RAILWAY_GIT_REPO_OWNER'
    ];
    
    const envStatus = {
        deployment_info: {
            platform: process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local',
            environment: process.env.RAILWAY_ENVIRONMENT || 'development',
            project_id: process.env.RAILWAY_PROJECT_ID || 'local',
            service_id: process.env.RAILWAY_SERVICE_ID || 'local',
            deployment_id: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
            replica_id: process.env.RAILWAY_REPLICA_ID || 'local',
            git_info: {
                commit: process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown',
                branch: process.env.RAILWAY_GIT_BRANCH || 'unknown',
                repo: process.env.RAILWAY_GIT_REPO_NAME || 'unknown',
                owner: process.env.RAILWAY_GIT_REPO_OWNER || 'unknown'
            }
        },
        required_variables: {},
        optional_variables: {},
        railway_variables: {},
        overall_status: 'healthy'
    };
    
    let missingRequired = 0;
    
    // Check required variables
    requiredVars.forEach(varName => {
        const exists = !!process.env[varName];
        envStatus.required_variables[varName] = {
            configured: exists,
            masked_value: exists ? `${process.env[varName].substring(0, 4)}...` : null
        };
        if (!exists) missingRequired++;
    });
    
    // Check optional variables
    optionalVars.forEach(varName => {
        const exists = !!process.env[varName];
        envStatus.optional_variables[varName] = {
            configured: exists,
            masked_value: exists ? `${process.env[varName].substring(0, 4)}...` : null,
            default_used: !exists
        };
    });
    
    // Check Railway-specific variables
    railwayVars.forEach(varName => {
        const exists = !!process.env[varName];
        envStatus.railway_variables[varName] = {
            configured: exists,
            value: exists ? process.env[varName] : null
        };
    });
    
    // Determine overall status
    if (missingRequired > 0) {
        envStatus.overall_status = 'error';
        envStatus.status_message = `Missing ${missingRequired} required environment variables`;
    } else if (missingRequired === 0) {
        envStatus.overall_status = 'healthy';
        envStatus.status_message = 'All required environment variables configured';
    }
    
    // Add configuration override status
    envStatus.configuration_overrides = checkConfigurationOverrides();
    
    return envStatus;
}

// Helper function to check configuration overrides via environment variables
function checkConfigurationOverrides() {
    const overrides = {};
    const configEnvVars = [
        'CONFIG_ALERT_LIGHTS',
        'CONFIG_ALERT_HORN', 
        'CONFIG_ALERT_BOTH',
        'CONFIG_DOORS_UNLOCK',
        'CONFIG_TRUNK_UNLOCK',
        'CONFIG_CHARGING_START',
        'CONFIG_CHARGING_STOP',
        'CONFIG_REQUIRE_CONFIRM_UNLOCK',
        'CONFIG_REQUIRE_CONFIRM_CHARGING',
        'CONFIG_REQUIRE_CONFIRM_ALERTS'
    ];
    
    configEnvVars.forEach(varName => {
        if (process.env[varName] !== undefined) {
            overrides[varName] = {
                value: process.env[varName],
                parsed: process.env[varName].toLowerCase() === 'true'
            };
        }
    });
    
    return {
        active_overrides: Object.keys(overrides).length,
        overrides: overrides,
        note: 'Environment variables can override config.json settings'
    };
}

// Helper function to generate API contract
function generateApiContract() {
    const envStatus = checkEnvironmentStatus();
    
    return {
        contract_version: '1.0.0',
        api_version: '2.0.0',
        generated_at: new Date().toISOString(),
        
        // Environment and deployment info
        deployment: {
            platform: envStatus.deployment_info.platform,
            environment: envStatus.deployment_info.environment,
            status: envStatus.overall_status,
            configuration_source: envStatus.configuration_overrides.active_overrides > 0 ? 'environment_variables' : 'config_file'
        },
        
        // Authentication contract
        authentication: {
            type: 'bearer_token',
            header: 'Authorization',
            format: 'Bearer {api_key}',
            api_key_source: 'API_KEY environment variable',
            default_key: 'brandt-car-boltaire-2025',
            note: 'Change default API key in production'
        },
        
        // Base URL contract
        base_url: {
            url: process.env.API_BASE_URL || 'http://localhost:8080',
            environment_variable: 'API_BASE_URL',
            note: 'Railway automatically sets this for deployed instances'
        },
        
        // Rate limiting contract
        rate_limits: {
            global: {
                window_minutes: 15,
                max_requests: 100,
                note: 'Applied to all endpoints'
            },
            alert_commands: config.security?.rate_limiting?.alert_commands || {
                window_minutes: 60,
                max_requests: 3,
                note: 'Stricter limits for disruptive commands'
            },
            door_commands: config.security?.rate_limiting?.door_commands || {
                window_minutes: 15,
                max_requests: 10,
                note: 'Moderate limits for security-related commands'
            }
        },
        
        // Response format contract
        response_format: {
            success_response: {
                success: true,
                message: 'string',
                timestamp: 'ISO 8601 datetime',
                data: 'object (optional)'
            },
            error_response: {
                success: false,
                message: 'string',
                timestamp: 'ISO 8601 datetime',
                data: 'object (optional, contains error details)'
            },
            status_codes: {
                200: 'Success',
                400: 'Bad Request (missing confirmation, invalid parameters)',
                401: 'Unauthorized (missing or invalid API key)',
                403: 'Forbidden (endpoint disabled)',
                429: 'Rate Limited',
                500: 'Internal Server Error (OnStar connection issues)'
            }
        },
        
        // Command categories contract
        command_categories: {
            information: {
                description: 'Read-only commands that retrieve vehicle data',
                safety_level: 'safe',
                authentication_required: true,
                confirmation_required: false,
                commands: ['get_status', 'get_location', 'get_diagnostics', 'get_charging_profile']
            },
            vehicle_control: {
                description: 'Commands that control vehicle functions',
                safety_level: 'safe_to_medium',
                authentication_required: true,
                confirmation_required: 'varies',
                commands: ['start_climate', 'stop_climate', 'lock_doors', 'unlock_doors', 'lock_trunk', 'unlock_trunk']
            },
            charging: {
                description: 'Commands that control vehicle charging',
                safety_level: 'medium',
                authentication_required: true,
                confirmation_required: 'configurable',
                commands: ['start_charging', 'stop_charging', 'set_charging_profile']
            },
            alerts: {
                description: 'Commands that trigger vehicle alerts (POTENTIALLY DISRUPTIVE)',
                safety_level: 'high_risk',
                authentication_required: true,
                confirmation_required: true,
                default_status: 'disabled',
                commands: ['flash_lights', 'honk_horn', 'alert_both', 'cancel_alert']
            },
            system: {
                description: 'System and configuration commands',
                safety_level: 'safe',
                authentication_required: 'varies',
                confirmation_required: false,
                commands: ['health_check', 'get_help', 'get_contract', 'reload_config']
            }
        },
        
        // Safety contract
        safety_contract: {
            safety_levels: {
                safe: {
                    description: 'No risk of disturbance or security issues',
                    auto_execute: true,
                    user_confirmation: false,
                    examples: ['get_status', 'lock_doors']
                },
                medium: {
                    description: 'May affect vehicle security or charging',
                    auto_execute: 'configurable',
                    user_confirmation: 'configurable',
                    examples: ['unlock_doors', 'start_charging']
                },
                high_risk: {
                    description: 'May cause disturbance or trigger alarms',
                    auto_execute: false,
                    user_confirmation: true,
                    default_status: 'disabled',
                    examples: ['flash_lights', 'honk_horn']
                }
            },
            confirmation_mechanism: {
                parameter: 'confirm',
                type: 'boolean',
                value: true,
                location: 'request_body',
                example: '{"confirm": true}'
            },
            disabled_commands: {
                check_method: 'GET /help',
                response_field: 'data.commands[].enabled',
                reason_field: 'data.commands[].disabled_reason'
            }
        },
        
        // Error handling contract
        error_handling: {
            disabled_endpoint: {
                status_code: 403,
                response: {
                    success: false,
                    message: 'This endpoint has been disabled for safety reasons. Check config.json to enable.',
                    data: {
                        endpoint: 'category.action',
                        enabled: false,
                        config_file: 'config.json'
                    }
                }
            },
            confirmation_required: {
                status_code: 400,
                response: {
                    success: false,
                    message: 'This action requires confirmation. Add \'confirm=true\' to your request body.',
                    data: {
                        action: 'action_name',
                        requires_confirmation: true,
                        hint: 'Add \'confirm: true\' to your request body to proceed'
                    }
                }
            },
            onstar_error: {
                status_code: 500,
                response: {
                    success: false,
                    message: 'OnStar service error: {error_details}',
                    data: {
                        error_type: 'onstar_connection',
                        retry_suggested: true
                    }
                }
            }
        },
        
        // Bot integration contract
        bot_integration: {
            recommended_flow: [
                '1. Call GET /help to understand available commands',
                '2. Check command.enabled before attempting execution',
                '3. Respect command.safety_level for user confirmation',
                '4. Add confirm: true for commands requiring confirmation',
                '5. Handle 403/400 errors gracefully with user feedback',
                '6. Implement retry logic for 500 errors'
            ],
            safety_recommendations: [
                'Never auto-execute high_risk commands',
                'Always prompt user for confirmation on medium risk commands',
                'Implement command whitelisting for autonomous operation',
                'Monitor rate limits to avoid service disruption',
                'Cache /help response but refresh periodically'
            ],
            example_implementations: {
                command_check: 'if (!command.enabled) return "Command disabled: " + command.disabled_reason',
                safety_check: 'if (command.safety_level === "high_risk") return "User confirmation required"',
                confirmation_add: 'if (command.requires_confirmation) params.confirm = true',
                error_handling: 'if (response.status === 403) return "Command not available: " + response.data.message'
            }
        },
        
        // Configuration contract
        configuration: {
            config_file: 'config.json',
            environment_overrides: envStatus.configuration_overrides.active_overrides > 0,
            reload_endpoint: 'POST /config/reload',
            real_time_updates: true,
            override_variables: [
                'CONFIG_ALERT_LIGHTS=true/false',
                'CONFIG_ALERT_HORN=true/false',
                'CONFIG_DOORS_UNLOCK=true/false',
                'CONFIG_REQUIRE_CONFIRM_UNLOCK=true/false'
            ]
        },
        
        // Service level agreement
        sla: {
            availability: '99.9% (subject to OnStar service availability)',
            response_time: 'Typically 1-30 seconds (depends on vehicle wake state)',
            vehicle_wake_time: 'Up to 60 seconds for sleeping vehicles',
            rate_limits: 'See rate_limits section',
            support: 'Check /health endpoint for service status'
        }
    };
}

// POST /config/reload
app.post('/config/reload', authenticateApiKey, async (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config = newConfig;
        
        console.log('Configuration reloaded successfully');
        res.json(createResponse(true, 'Configuration reloaded successfully', {
            timestamp: new Date().toISOString(),
            config: config
        }));
    } catch (error) {
        console.error('Failed to reload configuration:', error.message);
        res.status(500).json(createResponse(false, `Failed to reload configuration: ${error.message}`));
    }
});

// Database Analytics Endpoints

// GET /analytics/stats
app.get('/analytics/stats', authenticateApiKey, async (req, res) => {
    try {
        const { days = 7, endpoint, success, vehicle_vin } = req.query;
        
        const stats = await db.getCommandStats({
            days: parseInt(days),
            endpoint: endpoint || null,
            success: success === 'true' ? true : success === 'false' ? false : null,
            vehicleVin: vehicle_vin || null
        });
        
        res.json(createResponse(true, 'Analytics statistics retrieved', {
            period_days: parseInt(days),
            filters: { endpoint, success, vehicle_vin },
            statistics: stats
        }));
    } catch (error) {
        console.error('Failed to get analytics stats:', error.message);
        res.status(500).json(createResponse(false, `Failed to get analytics: ${error.message}`));
    }
});

// GET /analytics/recent
app.get('/analytics/recent', authenticateApiKey, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const commands = await db.getRecentCommands(parseInt(limit), parseInt(offset));
        
        res.json(createResponse(true, 'Recent commands retrieved', {
            commands: commands,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: commands.length
            }
        }));
    } catch (error) {
        console.error('Failed to get recent commands:', error.message);
        res.status(500).json(createResponse(false, `Failed to get recent commands: ${error.message}`));
    }
});

// GET /analytics/errors
app.get('/analytics/errors', authenticateApiKey, async (req, res) => {
    try {
        const { days = 7, limit = 100 } = req.query;
        
        const errors = await db.getErrorLogs(parseInt(days), parseInt(limit));
        
        res.json(createResponse(true, 'Error logs retrieved', {
            errors: errors,
            period_days: parseInt(days),
            total_errors: errors.length
        }));
    } catch (error) {
        console.error('Failed to get error logs:', error.message);
        res.status(500).json(createResponse(false, `Failed to get error logs: ${error.message}`));
    }
});

// GET /analytics/safety
app.get('/analytics/safety', authenticateApiKey, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const violations = await db.getSafetyViolations(parseInt(days));
        
        res.json(createResponse(true, 'Safety violations retrieved', {
            violations: violations,
            period_days: parseInt(days),
            total_violations: violations.length,
            risk_breakdown: {
                high_risk_attempts: violations.filter(v => v.safety_level === 'high_risk').length,
                missing_confirmations: violations.filter(v => v.requires_confirmation && !v.confirmation_provided).length,
                disabled_endpoint_attempts: violations.filter(v => v.response_status === 403).length
            }
        }));
    } catch (error) {
        console.error('Failed to get safety violations:', error.message);
        res.status(500).json(createResponse(false, `Failed to get safety violations: ${error.message}`));
    }
});

// POST /analytics/cleanup
app.post('/analytics/cleanup', authenticateApiKey, async (req, res) => {
    try {
        const { days_to_keep = 90 } = req.body;
        
        const deletedCount = await db.cleanupOldLogs(parseInt(days_to_keep));
        
        res.json(createResponse(true, 'Database cleanup completed', {
            deleted_records: deletedCount,
            days_kept: parseInt(days_to_keep),
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Failed to cleanup database:', error.message);
        res.status(500).json(createResponse(false, `Failed to cleanup database: ${error.message}`));
    }
});

// Helper function to parse diagnostics
function parseDiagnostics(diagnostics) {
    const vehicleData = {};
    
    for (const diagnostic of diagnostics) {
        if (diagnostic.diagnosticElement && diagnostic.diagnosticElement.length > 0) {
            const element = diagnostic.diagnosticElement[0];
            if (element.value !== undefined && element.value !== null) {
                vehicleData[element.name] = element.value;
            }
        }
    }
    
    return vehicleData;
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json(createResponse(false, 'Endpoint not found'));
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚗 Brandt Car API server running on port ${PORT}`);
    console.log(`📡 API Documentation: http://localhost:${PORT}/capabilities`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    
    // Initialize database
    try {
        await db.initializeTables();
        console.log(`📊 Database logging enabled`);
    } catch (error) {
        console.log(`⚠️  Database logging disabled: ${error.message}`);
    }
});

module.exports = app; 