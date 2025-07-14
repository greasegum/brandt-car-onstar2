# Brandt Car API Contract

## Overview

This document defines the complete API contract for the Brandt Car API, designed for AI bot integration with a 2020 Chevrolet Bolt EV via OnStar. The contract ensures safe, reliable, and predictable interactions between bots and the vehicle control system.

## Contract Endpoints

### Get Contract Information
- **URL**: `GET /contract`
- **Authentication**: Required (Bearer token)
- **Purpose**: Get the complete API contract with current configuration
- **Response**: Complete contract specification (this document in JSON format)

### Get Dynamic Help
- **URL**: `GET /help`
- **Authentication**: Not required
- **Purpose**: Get current command availability and safety status
- **Response**: Real-time command information with safety levels

## Environment Detection

The API automatically detects deployment environment and configuration:

### Railway Environment Variables
When deployed on Railway, the following variables are automatically available:
- `RAILWAY_ENVIRONMENT` - Environment name (production, staging, etc.)
- `RAILWAY_PROJECT_ID` - Unique project identifier
- `RAILWAY_SERVICE_ID` - Service identifier
- `RAILWAY_DEPLOYMENT_ID` - Current deployment identifier
- `RAILWAY_GIT_COMMIT_SHA` - Git commit hash
- `RAILWAY_GIT_BRANCH` - Git branch name
- `RAILWAY_GIT_REPO_NAME` - Repository name
- `RAILWAY_GIT_REPO_OWNER` - Repository owner

### Configuration Override Variables
Environment variables can override config.json settings:
- `CONFIG_ALERT_LIGHTS=true/false` - Enable/disable flash lights
- `CONFIG_ALERT_HORN=true/false` - Enable/disable horn
- `CONFIG_DOORS_UNLOCK=true/false` - Enable/disable door unlock
- `CONFIG_REQUIRE_CONFIRM_UNLOCK=true/false` - Require confirmation for unlock

## Authentication

### Bearer Token Authentication
```http
Authorization: Bearer {api_key}
```

- **API Key Source**: `API_KEY` environment variable
- **Default Key**: `brandt-car-boltaire-2025` (change in production)
- **Required For**: All endpoints except `/help` and `/health`

## Rate Limiting

### Global Rate Limits
- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP
- **Applied To**: All endpoints

### Command-Specific Limits
- **Alert Commands**: 3 requests per 60 minutes
- **Door Commands**: 10 requests per 15 minutes
- **Information Commands**: No additional limits

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "timestamp": "2025-01-04T10:30:00.000Z",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2025-01-04T10:30:00.000Z",
  "data": {
    "error_type": "error_category",
    "details": "Additional error information"
  }
}
```

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (missing confirmation, invalid parameters)
- **401**: Unauthorized (missing or invalid API key)
- **403**: Forbidden (endpoint disabled)
- **429**: Rate Limited
- **500**: Internal Server Error (OnStar connection issues)

## Command Categories

### 1. Information Commands (Safe)
**Safety Level**: `safe`
**Authentication**: Required
**Confirmation**: Not required

| Command | Endpoint | Description |
|---------|----------|-------------|
| `get_status` | `GET /status` | Complete vehicle status |
| `get_location` | `GET /location` | Current vehicle location |
| `get_diagnostics` | `GET /diagnostics` | Vehicle diagnostic data |
| `get_charging_profile` | `GET /charging/profile` | Charging profile/schedule |
| `health_check` | `GET /health` | API health status |

### 2. Vehicle Control Commands (Safe to Medium)
**Safety Level**: `safe` to `medium`
**Authentication**: Required
**Confirmation**: Varies by command

| Command | Endpoint | Safety Level | Confirmation |
|---------|----------|--------------|--------------|
| `start_climate` | `POST /climate/start` | Safe | Optional |
| `stop_climate` | `POST /climate/stop` | Safe | No |
| `lock_doors` | `POST /doors/lock` | Safe | No |
| `unlock_doors` | `POST /doors/unlock` | Medium | Configurable |
| `lock_trunk` | `POST /trunk/lock` | Safe | No |
| `unlock_trunk` | `POST /trunk/unlock` | Medium | Configurable |

### 3. Charging Commands (Medium)
**Safety Level**: `medium`
**Authentication**: Required
**Confirmation**: Configurable

| Command | Endpoint | Description |
|---------|----------|-------------|
| `start_charging` | `POST /charging/start` | Start charging immediately |
| `stop_charging` | `POST /charging/stop` | Stop current charging |
| `set_charging_profile` | `POST /charging/profile` | Update charging schedule |

### 4. Alert Commands (High Risk)
**Safety Level**: `high_risk`
**Authentication**: Required
**Confirmation**: Required
**Default Status**: Disabled

| Command | Endpoint | Warning |
|---------|----------|---------|
| `flash_lights` | `POST /alert/lights` | May trigger car alarm |
| `honk_horn` | `POST /alert/horn` | Loud noise disturbance |
| `alert_both` | `POST /alert/both` | Alarm + loud noise |
| `cancel_alert` | `POST /alert/cancel` | Safe - cancels alerts |

### 5. System Commands (Safe)
**Safety Level**: `safe`
**Authentication**: Varies
**Confirmation**: Not required

| Command | Endpoint | Authentication |
|---------|----------|----------------|
| `get_help` | `GET /help` | Not required |
| `get_contract` | `GET /contract` | Required |
| `reload_config` | `POST /config/reload` | Required |
| `health_check` | `GET /health` | Not required |

### 6. Debug Commands (Development)
**Safety Level**: `safe`
**Authentication**: Varies
**Confirmation**: Not required

| Command | Endpoint | Authentication | Purpose |
|---------|----------|----------------|---------|
| `debug_chrome` | `GET /debug/chrome` | Not required | Check Chrome/Playwright installation |
| `test_auth` | `POST /debug/test-auth` | Required | Test OnStar authentication |
| `force_auth` | `POST /auth/force` | Required | Force re-authentication |

## Safety Contract

### Safety Levels

#### 🟢 Safe
- **Auto Execute**: Yes
- **User Confirmation**: Not required
- **Risk**: No disturbance or security issues
- **Examples**: Status queries, locking doors

#### 🟡 Medium
- **Auto Execute**: Configurable
- **User Confirmation**: Configurable
- **Risk**: May affect security or charging
- **Examples**: Unlocking doors, charging control

#### 🔴 High Risk
- **Auto Execute**: Never
- **User Confirmation**: Always required
- **Risk**: Disturbance, alarms, noise
- **Examples**: Flash lights, horn, combined alerts
- **Default Status**: Disabled

### Confirmation Mechanism
When a command requires confirmation:
```json
{
  "confirm": true,
  // ... other parameters
}
```

### Checking Command Availability
Before executing any command:
1. Call `GET /help` to get current command status
2. Check `command.enabled` field
3. Check `command.safety_level`
4. Check `command.requires_confirmation`
5. Handle `command.disabled_reason` if disabled

## Session-Based Authentication (NEW)

### Efficient Session Management

The API now supports session-based authentication for dramatically improved performance:

#### 1. Session Authentication Flow
```bash
# Step 1: Authenticate (10-30 seconds)
curl -X POST https://your-api.railway.app/auth/session \
  -H "Authorization: Bearer brandt-car-boltaire-2025"

# Response:
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "sessionId": "session_1672847234_abc123",
    "status": "ready",
    "expiresAt": "2025-01-04T11:00:00.000Z",
    "vehicleCount": 1
  }
}
```

#### 2. Fast Command Execution (1-3 seconds)
```bash
# Commands now execute instantly using cached session
curl -X POST https://your-api.railway.app/doors/unlock \
  -H "Authorization: Bearer brandt-car-boltaire-2025" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'

# Response includes execution time:
{
  "success": true,
  "message": "Vehicle doors unlocked",
  "data": {
    "action": "unlocked",
    "execution_time_ms": 1247,
    "session": {
      "ready": true,
      "sessionId": "session_1672847234_abc123",
      "timeToExpiry": 1440000
    }
  }
}
```

#### 3. Session Status Monitoring
```bash
# Check session health
curl -X GET https://your-api.railway.app/auth/status \
  -H "Authorization: Bearer brandt-car-boltaire-2025"

# Response:
{
  "success": true,
  "data": {
    "session": {
      "ready": true,
      "authenticated": true,
      "expired": false,
      "expiringSoon": false,
      "timeToExpiry": 1440000
    }
  }
}
```

### Session Management Endpoints

| Endpoint | Method | Purpose | Response Time |
|----------|---------|---------|---------------|
| `/auth/session` | POST | Initialize session | 10-30 seconds |
| `/auth/status` | GET | Check session health | <1 second |
| `/auth/force` | POST | Force re-authentication | 10-30 seconds |
| `/auth/session` | DELETE | Clear session | <1 second |

### Performance Improvements

| Scenario | Before | After | Improvement |
|----------|---------|--------|-------------|
| First command | 10-30s | 10-30s | Same (auth required) |
| Subsequent commands | 10-30s each | 1-3s each | **90% faster** |
| Status check | 20-40s | 2-5s | **85% faster** |
| Multiple commands | 60-90s total | 15-20s total | **75% faster** |

## Bot Integration Guidelines

### Recommended Integration Flow (Updated)

1. **Initialize**: Call `GET /contract` to understand API capabilities
2. **Authenticate**: Call `POST /auth/session` to establish session (one-time 10-30s)
3. **Discover**: Call `GET /help` to get current command availability
4. **Monitor**: Check `GET /auth/status` periodically for session health
5. **Execute**: Send commands rapidly using cached session (1-3s each)
6. **Handle**: Process responses and monitor session expiry
7. **Refresh**: Re-authenticate when session expires (every 25 minutes)

### Session-Based Error Handling

#### Session Required (401)
```json
{
  "success": false,
  "message": "Session required: No active session - please authenticate first",
  "data": {
    "action": "authenticate",
    "endpoint": "/auth/session",
    "hint": "Please authenticate first using POST /auth/session"
  }
}
```

**Bot Response**: Call `POST /auth/session` to establish session, then retry command.

#### Session Expired (401)
```json
{
  "success": false,
  "message": "Session expired - please re-authenticate",
  "data": {
    "action": "authenticate",
    "endpoint": "/auth/session",
    "hint": "Session has expired, please re-authenticate"
  }
}
```

**Bot Response**: Re-authenticate and retry command.

#### Session Already Active (200)
```json
{
  "success": true,
  "message": "Session already active - no authentication needed",
  "data": {
    "sessionId": "session_1672847234_abc123",
    "expiresAt": "2025-01-04T11:00:00.000Z",
    "vehicleCount": 1,
    "reused": true
  }
}
```

**Bot Response**: Use existing session - no action needed.

#### Session Monitoring
All API responses now include session information:
```json
{
  "data": {
    "session": {
      "ready": true,
      "sessionId": "session_1672847234_abc123",
      "authenticated": true,
      "expired": false,
      "expiringSoon": false,
      "timeToExpiry": 1440000
    }
  }
}
```

### Safety Recommendations

#### Never Auto-Execute
- High-risk commands (`flash_lights`, `honk_horn`, `alert_both`)
- Disabled commands
- Commands without proper confirmation

#### Always Prompt User
- Medium-risk commands requiring confirmation
- First-time execution of any vehicle control command
- Commands that could affect planned schedules (charging)

#### Implement Safeguards
- Command whitelisting for autonomous operation
- Rate limit monitoring
- Error handling and retry logic
- User notification for safety-critical operations
- **Session monitoring**: Check `expiringSoon` flag for proactive re-authentication
- **Session protection**: Avoid unnecessary re-authentication to prevent rate limiting

### Example Bot Implementation (Updated)

```javascript
class BrandtCarBot {
  constructor() {
    this.sessionId = null;
    this.sessionExpiry = null;
    this.contract = null;
    this.commands = [];
  }
  
  async initialize() {
    // Get contract and help information
    const contract = await this.getContract();
    const help = await this.getHelp();
    
    this.contract = contract;
    this.commands = help.commands;
    this.environmentStatus = help.environment_status;
  }
  
  async ensureSession() {
    // Check if session exists and is not expired
    if (this.sessionId && this.sessionExpiry && new Date() < this.sessionExpiry) {
      return this.sessionId;
    }
    
    console.log('🔐 Establishing session...');
    const authResponse = await this.callApi('/auth/session', {}, 'POST');
    
    if (authResponse.success) {
      this.sessionId = authResponse.data.sessionId;
      this.sessionExpiry = new Date(authResponse.data.expiresAt);
      
      if (authResponse.data.reused) {
        console.log(`ℹ️ Session reused: ${this.sessionId}`);
      } else {
        console.log(`✅ Session established: ${this.sessionId}`);
      }
      console.log(`⏰ Expires: ${this.sessionExpiry.toISOString()}`);
      return this.sessionId;
    } else {
      throw new Error(`Session authentication failed: ${authResponse.message}`);
    }
  }
  
  async canExecuteCommand(commandName) {
    const command = this.commands.find(cmd => cmd.command === commandName);
    
    if (!command) return { canExecute: false, reason: 'Command not found' };
    if (!command.enabled) return { canExecute: false, reason: command.disabled_reason };
    if (command.safety_level === 'high_risk') return { canExecute: false, reason: 'High risk - user confirmation required' };
    
    return { canExecute: true, requiresConfirmation: command.requires_confirmation };
  }
  
  async executeCommand(commandName, params = {}) {
    // Ensure we have an active session
    await this.ensureSession();
    
    const check = await this.canExecuteCommand(commandName);
    
    if (!check.canExecute) {
      throw new Error(`Cannot execute ${commandName}: ${check.reason}`);
    }
    
    if (check.requiresConfirmation && !params.confirm) {
      // Prompt user for confirmation
      const userConfirmed = await this.promptUser(`Confirm ${commandName}?`);
      if (!userConfirmed) throw new Error('User cancelled operation');
      params.confirm = true;
    }
    
    const command = this.commands.find(cmd => cmd.command === commandName);
    
    try {
      const result = await this.callApi(command.endpoint, params);
      
      // Check session status from response
      if (result.data && result.data.session && result.data.session.expiringSoon) {
        console.log('⚠️ Session expiring soon - will re-authenticate on next command');
      }
      
      return result;
    } catch (error) {
      // Handle session expiry
      if (error.message.includes('Session required') || error.message.includes('Session expired')) {
        console.log('🔄 Session expired, re-authenticating...');
        this.sessionId = null;
        this.sessionExpiry = null;
        await this.ensureSession();
        
        // Retry the command
        return await this.callApi(command.endpoint, params);
      }
      throw error;
    }
  }
  
  async getSessionStatus() {
    return await this.callApi('/auth/status');
  }
  
  // Example usage showing performance benefits
  async demonstratePerformance() {
    console.log('🚀 Performance demonstration:');
    
    // First command: includes authentication time
    const start1 = Date.now();
    await this.executeCommand('get_status');
    const time1 = Date.now() - start1;
    console.log(`First command: ${time1}ms`);
    
    // Subsequent commands: use cached session
    const start2 = Date.now();
    await this.executeCommand('lock_doors');
    const time2 = Date.now() - start2;
    console.log(`Second command: ${time2}ms`);
    
    const start3 = Date.now();
    await this.executeCommand('get_status');
    const time3 = Date.now() - start3;
    console.log(`Third command: ${time3}ms`);
    
    console.log(`Performance improvement: ${Math.round((time1 - time2) / time1 * 100)}% faster`);
  }
}
```

## Error Handling

### Common Error Scenarios

#### Disabled Endpoint (403)
```json
{
  "success": false,
  "message": "This endpoint has been disabled for safety reasons",
  "data": {
    "endpoint": "alert.lights",
    "enabled": false,
    "config_file": "config.json"
  }
}
```

**Bot Response**: Inform user that command is disabled for safety, suggest checking configuration.

#### Confirmation Required (400)
```json
{
  "success": false,
  "message": "This action requires confirmation",
  "data": {
    "action": "doors_unlock",
    "requires_confirmation": true,
    "hint": "Add 'confirm: true' to your request body"
  }
}
```

**Bot Response**: Prompt user for confirmation and retry with `confirm: true`.

#### OnStar Error (500)
```json
{
  "success": false,
  "message": "OnStar service error: Vehicle not responding",
  "data": {
    "error_type": "onstar_connection",
    "retry_suggested": true
  }
}
```

**Bot Response**: Inform user of temporary service issue, suggest retry after vehicle wake-up period.

## Service Level Agreement

### Availability
- **Target**: 99.9% uptime
- **Dependency**: OnStar service availability
- **Monitoring**: `/health` endpoint

### Response Times
- **Information Commands**: 1-5 seconds
- **Control Commands**: 5-30 seconds
- **Vehicle Wake-up**: Up to 60 seconds for sleeping vehicles

### Rate Limits
- **Global**: 100 requests per 15 minutes
- **Alert Commands**: 3 requests per 60 minutes
- **Door Commands**: 10 requests per 15 minutes

### Support
- **Health Check**: `GET /health`
- **Status Monitoring**: Environment status in `/help`
- **Configuration**: Real-time via `/config/reload`

## Security Considerations

### Production Deployment
1. **Change Default API Key**: Set unique `API_KEY` environment variable
2. **Enable HTTPS**: Railway provides automatic HTTPS
3. **Monitor Access**: Check logs for unusual activity
4. **Limit Permissions**: Use least-privilege principle for bot access

### Environment Variables
- **Required Variables**: Must be set for API to function
- **Sensitive Data**: Masked in status responses
- **Configuration Overrides**: Environment variables take precedence over config.json

### Safety Measures
- **Alert Commands**: Disabled by default
- **Confirmation Requirements**: Configurable per command
- **Rate Limiting**: Prevents abuse
- **Audit Logging**: All requests logged with timestamps

## Testing and Validation

### Test Endpoints
```bash
# Get contract
curl -X GET https://your-api.railway.app/contract \
  -H "Authorization: Bearer your-api-key"

# Get help
curl -X GET https://your-api.railway.app/help

# Test safe command
curl -X GET https://your-api.railway.app/status \
  -H "Authorization: Bearer your-api-key"

# Test confirmation requirement
curl -X POST https://your-api.railway.app/doors/unlock \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'

# Debug Chrome installation
curl -X GET https://your-api.railway.app/debug/chrome

# Test authentication
curl -X POST https://your-api.railway.app/debug/test-auth \
  -H "Authorization: Bearer your-api-key"

# Force re-authentication (bypasses session check)
curl -X POST https://your-api.railway.app/auth/force \
  -H "Authorization: Bearer your-api-key"
```

### Validation Checklist
- [ ] Contract endpoint returns valid JSON
- [ ] Help endpoint shows current command status
- [ ] Environment variables properly detected
- [ ] Safety levels correctly enforced
- [ ] Confirmation requirements working
- [ ] Rate limiting active
- [ ] Error responses properly formatted
- [ ] Chrome/Playwright installation verified
- [ ] Authentication test passes
- [ ] Session protection working (no unnecessary re-auth)
- [ ] Force re-authentication endpoint functional

## Migration Guide

### Upgrading from v2.0.0 to v2.1.0

#### For Existing Bots
1. **Optional Migration**: Session-based authentication is optional - existing bots continue to work
2. **Performance Gains**: Update to session-based flow for 75-90% performance improvement
3. **Backward Compatibility**: All existing endpoints remain unchanged

#### Migration Steps
1. Add session establishment: `POST /auth/session` before command sequences
2. Add session monitoring: Check `session.expiringSoon` in responses
3. Add error handling: Handle 401 responses with re-authentication
4. Update command batching: Group commands after single authentication

#### Quick Migration Example
```javascript
// Before (v2.0.0):
await api.getStatus();      // 20-30s
await api.lockDoors();      // 20-30s
await api.unlockDoors();    // 20-30s
// Total: 60-90s

// After (v2.1.0):
await api.authenticate();   // 20-30s (one-time)
await api.getStatus();      // 2-5s
await api.lockDoors();      // 1-3s
await api.unlockDoors();    // 1-3s
// Total: 24-41s (60% faster)
```

## Version History

- **v1.0.0**: Initial contract specification
- **v2.0.0**: Added Railway environment detection and configuration overrides
- **v2.1.0**: Added session-based authentication and performance optimization
- **v2.2.0**: Added session protection and rate limiting improvements

---

*This contract is automatically generated and reflects the current API configuration. Use `GET /contract` to get the most up-to-date version.* 