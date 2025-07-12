/**
 * Database module for Brandt Car API
 * Handles PostgreSQL connections and logging
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'brandt_car_api',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Create connection pool
let pool = null;

function getPool() {
    if (!pool) {
        pool = new Pool(dbConfig);
        
        // Handle pool errors
        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });
        
        // Test connection
        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('Database connection failed:', err.message);
            } else {
                console.log('✅ Database connected successfully');
            }
        });
    }
    return pool;
}

// Initialize database tables
async function initializeTables() {
    const pool = getPool();
    
    try {
        // Create command_log table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS command_log (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                endpoint VARCHAR(100) NOT NULL,
                method VARCHAR(10) NOT NULL,
                user_agent TEXT,
                ip_address INET,
                api_key_hash VARCHAR(64),
                request_body JSONB,
                response_status INTEGER,
                response_body JSONB,
                execution_time_ms INTEGER,
                success BOOLEAN,
                error_message TEXT,
                vehicle_vin VARCHAR(17),
                command_type VARCHAR(50),
                safety_level VARCHAR(20),
                requires_confirmation BOOLEAN,
                confirmation_provided BOOLEAN,
                environment VARCHAR(50),
                deployment_id VARCHAR(100)
            )
        `);
        
        // Create indexes for better performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_command_log_timestamp ON command_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_command_log_endpoint ON command_log(endpoint);
            CREATE INDEX IF NOT EXISTS idx_command_log_success ON command_log(success);
            CREATE INDEX IF NOT EXISTS idx_command_log_vehicle_vin ON command_log(vehicle_vin);
        `);
        
        console.log('✅ Database tables initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize database tables:', error.message);
        throw error;
    }
}

// Log API request/response
async function logApiRequest(logData) {
    const pool = getPool();
    
    const {
        endpoint,
        method,
        userAgent,
        ipAddress,
        apiKey,
        requestBody,
        responseStatus,
        responseBody,
        executionTime,
        success,
        errorMessage,
        vehicleVin,
        commandType,
        safetyLevel,
        requiresConfirmation,
        confirmationProvided,
        environment,
        deploymentId
    } = logData;
    
    // Hash API key for security
    const apiKeyHash = apiKey ? require('crypto').createHash('sha256').update(apiKey).digest('hex') : null;
    
    try {
        const query = `
            INSERT INTO command_log (
                endpoint, method, user_agent, ip_address, api_key_hash,
                request_body, response_status, response_body, execution_time_ms,
                success, error_message, vehicle_vin, command_type, safety_level,
                requires_confirmation, confirmation_provided, environment, deployment_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `;
        
        const values = [
            endpoint,
            method,
            userAgent,
            ipAddress,
            apiKeyHash,
            requestBody ? JSON.stringify(requestBody) : null,
            responseStatus,
            responseBody ? JSON.stringify(responseBody) : null,
            executionTime,
            success,
            errorMessage,
            vehicleVin,
            commandType,
            safetyLevel,
            requiresConfirmation,
            confirmationProvided,
            environment,
            deploymentId
        ];
        
        await pool.query(query, values);
        
    } catch (error) {
        console.error('❌ Failed to log API request:', error.message);
        // Don't throw error - logging failure shouldn't break the API
    }
}

// Get command statistics
async function getCommandStats(options = {}) {
    const pool = getPool();
    
    const {
        days = 7,
        endpoint = null,
        success = null,
        vehicleVin = null
    } = options;
    
    try {
        let whereClause = 'WHERE timestamp >= NOW() - INTERVAL \'1 day\' * $1';
        let params = [days];
        let paramIndex = 2;
        
        if (endpoint) {
            whereClause += ` AND endpoint = $${paramIndex}`;
            params.push(endpoint);
            paramIndex++;
        }
        
        if (success !== null) {
            whereClause += ` AND success = $${paramIndex}`;
            params.push(success);
            paramIndex++;
        }
        
        if (vehicleVin) {
            whereClause += ` AND vehicle_vin = $${paramIndex}`;
            params.push(vehicleVin);
            paramIndex++;
        }
        
        const query = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN success = true THEN 1 END) as successful_requests,
                COUNT(CASE WHEN success = false THEN 1 END) as failed_requests,
                AVG(execution_time_ms) as avg_execution_time,
                MAX(execution_time_ms) as max_execution_time,
                COUNT(CASE WHEN requires_confirmation = true THEN 1 END) as confirmation_required,
                COUNT(CASE WHEN confirmation_provided = true THEN 1 END) as confirmation_provided,
                COUNT(CASE WHEN safety_level = 'high_risk' THEN 1 END) as high_risk_commands,
                COUNT(CASE WHEN safety_level = 'medium' THEN 1 END) as medium_risk_commands,
                COUNT(CASE WHEN safety_level = 'safe' THEN 1 END) as safe_commands
            FROM command_log
            ${whereClause}
        `;
        
        const result = await pool.query(query, params);
        return result.rows[0];
        
    } catch (error) {
        console.error('❌ Failed to get command stats:', error.message);
        throw error;
    }
}

// Get recent commands
async function getRecentCommands(limit = 50, offset = 0) {
    const pool = getPool();
    
    try {
        const query = `
            SELECT 
                id,
                timestamp,
                endpoint,
                method,
                ip_address,
                response_status,
                execution_time_ms,
                success,
                error_message,
                vehicle_vin,
                command_type,
                safety_level,
                requires_confirmation,
                confirmation_provided,
                environment
            FROM command_log
            ORDER BY timestamp DESC
            LIMIT $1 OFFSET $2
        `;
        
        const result = await pool.query(query, [limit, offset]);
        return result.rows;
        
    } catch (error) {
        console.error('❌ Failed to get recent commands:', error.message);
        throw error;
    }
}

// Get error logs
async function getErrorLogs(days = 7, limit = 100) {
    const pool = getPool();
    
    try {
        const query = `
            SELECT 
                id,
                timestamp,
                endpoint,
                method,
                ip_address,
                error_message,
                request_body,
                response_body,
                vehicle_vin,
                command_type,
                safety_level
            FROM command_log
            WHERE success = false 
            AND timestamp >= NOW() - INTERVAL '1 day' * $1
            ORDER BY timestamp DESC
            LIMIT $2
        `;
        
        const result = await pool.query(query, [days, limit]);
        return result.rows;
        
    } catch (error) {
        console.error('❌ Failed to get error logs:', error.message);
        throw error;
    }
}

// Get safety violation attempts
async function getSafetyViolations(days = 30) {
    const pool = getPool();
    
    try {
        const query = `
            SELECT 
                id,
                timestamp,
                endpoint,
                ip_address,
                request_body,
                response_status,
                error_message,
                vehicle_vin,
                command_type,
                safety_level,
                requires_confirmation,
                confirmation_provided
            FROM command_log
            WHERE (
                (safety_level = 'high_risk' AND success = true) OR
                (requires_confirmation = true AND confirmation_provided = false) OR
                response_status = 403
            )
            AND timestamp >= NOW() - INTERVAL '1 day' * $1
            ORDER BY timestamp DESC
        `;
        
        const result = await pool.query(query, [days]);
        return result.rows;
        
    } catch (error) {
        console.error('❌ Failed to get safety violations:', error.message);
        throw error;
    }
}

// Clean up old logs
async function cleanupOldLogs(daysToKeep = 90) {
    const pool = getPool();
    
    try {
        const query = `
            DELETE FROM command_log
            WHERE timestamp < NOW() - INTERVAL '1 day' * $1
        `;
        
        const result = await pool.query(query, [daysToKeep]);
        console.log(`✅ Cleaned up ${result.rowCount} old log entries`);
        return result.rowCount;
        
    } catch (error) {
        console.error('❌ Failed to cleanup old logs:', error.message);
        throw error;
    }
}

// Close database connection
async function closeConnection() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Database connection closed');
    }
}

module.exports = {
    getPool,
    initializeTables,
    logApiRequest,
    getCommandStats,
    getRecentCommands,
    getErrorLogs,
    getSafetyViolations,
    cleanupOldLogs,
    closeConnection
}; 