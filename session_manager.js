/**
 * Session Manager for OnStar API
 * Handles authentication, token management, and session state
 */

const OnStar = require('onstarjs2');
const fs = require('fs');
const path = require('path');

class SessionManager {
    constructor() {
        this.onstarClient = null;
        this.sessionState = {
            isAuthenticated: false,
            lastAuthTime: null,
            tokenExpiry: null,
            sessionId: null,
            authenticationInProgress: false,
            lastError: null
        };
        this.tokenLocation = process.env.ONSTAR_TOKEN_LOCATION || './tokens/';
        this.authPromise = null; // Track ongoing authentication
    }

    /**
     * Initialize a new authentication session
     */
    async authenticate() {
        // Prevent multiple concurrent authentications
        if (this.authPromise) {
            return this.authPromise;
        }

        this.sessionState.authenticationInProgress = true;
        this.sessionState.lastError = null;

        this.authPromise = this._performAuthentication();
        
        try {
            const result = await this.authPromise;
            this.authPromise = null;
            return result;
        } catch (error) {
            this.authPromise = null;
            throw error;
        }
    }

    async _performAuthentication() {
        try {
            console.log('🔐 Starting OnStar authentication...');
            
            // Create OnStar client with configuration
            const config = {
                username: process.env.ONSTAR_USERNAME,
                password: process.env.ONSTAR_PASSWORD,
                vin: process.env.ONSTAR_VIN,
                onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
                onStarPin: process.env.ONSTAR_PIN,
                deviceId: process.env.ONSTAR_DEVICEID,
                tokenLocation: this.tokenLocation,
                checkRequestStatus: true,
                requestPollingTimeoutSeconds: 120,
                requestPollingIntervalSeconds: 10
            };

            this.onstarClient = OnStar.create(config);

            // Test authentication with a lightweight call
            console.log('🔄 Testing authentication with account vehicles...');
            const vehicles = await this.onstarClient.getAccountVehicles();
            
            if (vehicles && vehicles.response && vehicles.response.data) {
                // Authentication successful
                this.sessionState = {
                    isAuthenticated: true,
                    lastAuthTime: new Date(),
                    tokenExpiry: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes (5 min buffer)
                    sessionId: this._generateSessionId(),
                    authenticationInProgress: false,
                    lastError: null,
                    vehicleCount: vehicles.response.data.length
                };

                console.log('✅ Authentication successful!');
                console.log(`📱 Session ID: ${this.sessionState.sessionId}`);
                console.log(`🚗 Found ${this.sessionState.vehicleCount} vehicle(s)`);
                console.log(`⏰ Session expires: ${this.sessionState.tokenExpiry.toISOString()}`);

                return {
                    success: true,
                    sessionId: this.sessionState.sessionId,
                    expiresAt: this.sessionState.tokenExpiry,
                    vehicleCount: this.sessionState.vehicleCount,
                    message: 'Authentication successful - ready for commands'
                };
            } else {
                throw new Error('Authentication successful but no vehicle data returned');
            }

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            
            this.sessionState = {
                isAuthenticated: false,
                lastAuthTime: null,
                tokenExpiry: null,
                sessionId: null,
                authenticationInProgress: false,
                lastError: error.message
            };

            this.onstarClient = null;
            
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Check current session status
     */
    getSessionStatus() {
        const now = new Date();
        const isExpired = this.sessionState.tokenExpiry && now > this.sessionState.tokenExpiry;
        const isExpiringSoon = this.sessionState.tokenExpiry && 
                               (this.sessionState.tokenExpiry.getTime() - now.getTime()) < 5 * 60 * 1000; // 5 minutes

        return {
            isAuthenticated: this.sessionState.isAuthenticated && !isExpired,
            sessionId: this.sessionState.sessionId,
            lastAuthTime: this.sessionState.lastAuthTime,
            tokenExpiry: this.sessionState.tokenExpiry,
            isExpired,
            isExpiringSoon,
            authenticationInProgress: this.sessionState.authenticationInProgress,
            lastError: this.sessionState.lastError,
            vehicleCount: this.sessionState.vehicleCount,
            timeToExpiry: this.sessionState.tokenExpiry ? 
                         Math.max(0, this.sessionState.tokenExpiry.getTime() - now.getTime()) : null
        };
    }

    /**
     * Get authenticated OnStar client for commands
     */
    async getClient() {
        const status = this.getSessionStatus();
        
        if (!status.isAuthenticated) {
            throw new Error('No active session - please authenticate first');
        }

        if (status.isExpired) {
            throw new Error('Session expired - please re-authenticate');
        }

        if (status.isExpiringSoon) {
            console.log('⚠️ Session expiring soon, consider re-authenticating');
        }

        return this.onstarClient;
    }

    /**
     * Execute a command with the authenticated client
     */
    async executeCommand(commandName, commandFunc) {
        const client = await this.getClient();
        
        try {
            console.log(`🚗 Executing command: ${commandName}`);
            const startTime = Date.now();
            
            const result = await commandFunc(client);
            
            const executionTime = Date.now() - startTime;
            console.log(`✅ Command ${commandName} completed in ${executionTime}ms`);
            
            return { success: true, result, executionTime };
        } catch (error) {
            console.error(`❌ Command ${commandName} failed:`, error.message);
            
            // Check if error is due to authentication issues
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                // Mark session as expired
                this.sessionState.isAuthenticated = false;
                this.sessionState.lastError = 'Session expired during command execution';
                this.onstarClient = null;
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if tokens exist and are potentially valid
     */
    hasStoredTokens() {
        const msTokenPath = path.join(this.tokenLocation, 'microsoft_tokens.json');
        const gmTokenPath = path.join(this.tokenLocation, 'gm_tokens.json');
        
        return fs.existsSync(msTokenPath) && fs.existsSync(gmTokenPath);
    }

    /**
     * Clear session and tokens
     */
    async clearSession() {
        this.sessionState = {
            isAuthenticated: false,
            lastAuthTime: null,
            tokenExpiry: null,
            sessionId: null,
            authenticationInProgress: false,
            lastError: null
        };
        
        this.onstarClient = null;
        
        // Optionally clear token files
        const msTokenPath = path.join(this.tokenLocation, 'microsoft_tokens.json');
        const gmTokenPath = path.join(this.tokenLocation, 'gm_tokens.json');
        
        try {
            if (fs.existsSync(msTokenPath)) fs.unlinkSync(msTokenPath);
            if (fs.existsSync(gmTokenPath)) fs.unlinkSync(gmTokenPath);
            console.log('🗑️ Session cleared and tokens removed');
        } catch (error) {
            console.warn('⚠️ Could not clear token files:', error.message);
        }
    }

    /**
     * Generate a unique session ID
     */
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get session summary for API responses
     */
    getSessionSummary() {
        const status = this.getSessionStatus();
        
        return {
            ready: status.isAuthenticated && !status.isExpired,
            sessionId: status.sessionId,
            authenticated: status.isAuthenticated,
            expired: status.isExpired,
            expiringSoon: status.isExpiringSoon,
            authInProgress: status.authenticationInProgress,
            timeToExpiry: status.timeToExpiry,
            lastError: status.lastError
        };
    }
}

// Export singleton instance
module.exports = new SessionManager(); 