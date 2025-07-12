/**
 * Brandt Car API - Node.js Express Server
 * REST API for controlling 2020 Chevrolet Bolt EV via OnStar
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import existing OnStar functionality
const OnStar = require('onstarjs2');
const _ = require('lodash');

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

// Create OnStar client
function createOnStarClient() {
    const config = {
        username: process.env.ONSTAR_USERNAME,
        password: process.env.ONSTAR_PASSWORD,
        vin: process.env.ONSTAR_VIN,
        onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
        onStarPin: process.env.ONSTAR_PIN,
        deviceId: process.env.ONSTAR_DEVICEID,
        tokenLocation: process.env.ONSTAR_TOKEN_LOCATION || './tokens/',
        checkRequestStatus: true,
        requestPollingTimeoutSeconds: 120,
        requestPollingIntervalSeconds: 10
    };
    
    return OnStar.create(config);
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

// Helper function to execute OnStar commands
async function executeOnStarCommand(commandFunc, ...args) {
    try {
        const client = createOnStarClient();
        const result = await commandFunc(client, ...args);
        return { success: true, result };
    } catch (error) {
        console.error('OnStar command failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Vehicle Control Endpoints

// POST /climate/start
app.post('/climate/start', authenticateApiKey, async (req, res) => {
    try {
        const { duration_minutes = 10, force = false, temperature } = req.body;
        
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.start()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to start climate: ${error}`));
        }
        
        res.json(createResponse(true, 'Climate preconditioning started', {
            duration_minutes,
            command_id: `cmd_${Date.now()}`,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Climate start failed:', error);
        res.status(500).json(createResponse(false, `Failed to start climate: ${error.message}`));
    }
});

// POST /climate/stop
app.post('/climate/stop', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.cancelStart()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to stop climate: ${error}`));
        }
        
        res.json(createResponse(true, 'Climate preconditioning stopped', {
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Climate stop failed:', error);
        res.status(500).json(createResponse(false, `Failed to stop climate: ${error.message}`));
    }
});

// POST /doors/lock
app.post('/doors/lock', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.lockDoor()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to lock doors: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle doors locked', {
            action: 'locked',
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Door lock failed:', error);
        res.status(500).json(createResponse(false, `Failed to lock doors: ${error.message}`));
    }
});

// POST /doors/unlock
app.post('/doors/unlock', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.unlockDoor()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to unlock doors: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle doors unlocked', {
            action: 'unlocked',
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Door unlock failed:', error);
        res.status(500).json(createResponse(false, `Failed to unlock doors: ${error.message}`));
    }
});

// POST /trunk/lock
app.post('/trunk/lock', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.lockTrunk()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to lock trunk: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle trunk locked', {
            action: 'trunk_locked',
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Trunk lock failed:', error);
        res.status(500).json(createResponse(false, `Failed to lock trunk: ${error.message}`));
    }
});

// POST /trunk/unlock
app.post('/trunk/unlock', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.unlockTrunk()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to unlock trunk: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle trunk unlocked', {
            action: 'trunk_unlocked',
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Trunk unlock failed:', error);
        res.status(500).json(createResponse(false, `Failed to unlock trunk: ${error.message}`));
    }
});

// POST /alert/lights
app.post('/alert/lights', authenticateApiKey, async (req, res) => {
    try {
        const { duration_seconds = 30 } = req.body;
        
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.alert({
                action: ['Flash'],
                duration: duration_seconds
            })
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to activate lights: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle lights activated', {
            duration_seconds,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Light alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to activate lights: ${error.message}`));
    }
});

// POST /alert/horn
app.post('/alert/horn', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.alert({
                action: ['Honk']
            })
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to activate horn: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle horn activated', {
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Horn alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to activate horn: ${error.message}`));
    }
});

// POST /alert/both
app.post('/alert/both', authenticateApiKey, async (req, res) => {
    try {
        const { duration_seconds = 30 } = req.body;
        
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.alert({
                action: ['Flash', 'Honk'],
                duration: duration_seconds
            })
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to activate alerts: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle lights and horn activated', {
            duration_seconds,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Combined alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to activate alerts: ${error.message}`));
    }
});

// POST /alert/cancel
app.post('/alert/cancel', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.cancelAlert()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to cancel alerts: ${error}`));
        }
        
        res.json(createResponse(true, 'Vehicle alerts cancelled', {
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Cancel alert failed:', error);
        res.status(500).json(createResponse(false, `Failed to cancel alerts: ${error.message}`));
    }
});

// Vehicle Information Endpoints

// GET /status
app.get('/status', authenticateApiKey, async (req, res) => {
    try {
        const client = createOnStarClient();
        
        // Get diagnostics
        const diagnosticsResult = await client.diagnostics({
            diagnosticItem: [
                'EV BATTERY LEVEL',
                'EV RANGE',
                'ODOMETER',
                'TIRE PRESSURE',
                'AMBIENT AIR TEMPERATURE',
                'EV CHARGE STATE',
                'EV PLUG STATE'
            ]
        });
        
        // Get location
        const locationResult = await client.location();
        
        // Parse diagnostics
        const diagnostics = diagnosticsResult.response.data.commandResponse.body.diagnosticResponse;
        const vehicleData = parseDiagnostics(diagnostics);
        
        // Parse location
        const locationData = locationResult.response.data.commandResponse.body;
        
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
            }
        }));
    } catch (error) {
        console.error('Status retrieval failed:', error);
        res.status(500).json(createResponse(false, `Failed to get vehicle status: ${error.message}`));
    }
});

// GET /location
app.get('/location', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.location()
        );
        
        if (!success) {
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
            }
        }));
    } catch (error) {
        console.error('Location retrieval failed:', error);
        res.status(500).json(createResponse(false, `Failed to get vehicle location: ${error.message}`));
    }
});

// GET /diagnostics
app.get('/diagnostics', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.diagnostics()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to get diagnostics: ${error}`));
        }
        
        const diagnostics = result.response.data.commandResponse.body.diagnosticResponse;
        const vehicleData = parseDiagnostics(diagnostics);
        
        res.json(createResponse(true, 'Vehicle diagnostics retrieved', {
            diagnostics: vehicleData
        }));
    } catch (error) {
        console.error('Diagnostics retrieval failed:', error);
        res.status(500).json(createResponse(false, `Failed to get diagnostics: ${error.message}`));
    }
});

// EV-Specific Endpoints

// POST /charging/start
app.post('/charging/start', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.chargeOverride({ mode: 'CHARGE_NOW' })
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to start charging: ${error}`));
        }
        
        res.json(createResponse(true, 'Charging started', {
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Start charging failed:', error);
        res.status(500).json(createResponse(false, `Failed to start charging: ${error.message}`));
    }
});

// POST /charging/stop
app.post('/charging/stop', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.chargeOverride({ mode: 'STOP_CHARGING' })
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to stop charging: ${error}`));
        }
        
        res.json(createResponse(true, 'Charging stopped', {
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Stop charging failed:', error);
        res.status(500).json(createResponse(false, `Failed to stop charging: ${error.message}`));
    }
});

// GET /charging/profile
app.get('/charging/profile', authenticateApiKey, async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.getChargingProfile()
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to get charge profile: ${error}`));
        }
        
        const profile = result.response.data.commandResponse.body;
        
        res.json(createResponse(true, 'Charging profile retrieved', {
            profile
        }));
    } catch (error) {
        console.error('Get charge profile failed:', error);
        res.status(500).json(createResponse(false, `Failed to get charging profile: ${error.message}`));
    }
});

// POST /charging/profile
app.post('/charging/profile', authenticateApiKey, async (req, res) => {
    try {
        const { scheduled_start = '23:00', target_level = 90, rate_limit = 'normal' } = req.body;
        
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.setChargingProfile({
                chargeMode: 'SCHEDULED',
                rateType: rate_limit.toUpperCase()
            })
        );
        
        if (!success) {
            return res.status(500).json(createResponse(false, `Failed to set charge profile: ${error}`));
        }
        
        res.json(createResponse(true, 'Charging profile updated', {
            scheduled_start,
            target_level,
            rate_limit,
            status: result.response.data.commandResponse.status
        }));
    } catch (error) {
        console.error('Set charge profile failed:', error);
        res.status(500).json(createResponse(false, `Failed to set charging profile: ${error.message}`));
    }
});

// System Endpoints

// GET /health
app.get('/health', async (req, res) => {
    try {
        const { success, result, error } = await executeOnStarCommand(
            (client) => client.getAccountVehicles()
        );
        
        if (success) {
            res.json(createResponse(true, 'System healthy', {
                status: 'healthy',
                service: 'brandt-car-api-v2',
                version: '2.0.0',
                onstar_connection: {
                    authenticated: true,
                    last_successful_call: new Date().toISOString()
                }
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
app.get('/capabilities', authenticateApiKey, async (req, res) => {
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
        }
    }));
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
app.listen(PORT, () => {
    console.log(`🚗 Brandt Car API server running on port ${PORT}`);
    console.log(`📡 API Documentation: http://localhost:${PORT}/capabilities`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app; 