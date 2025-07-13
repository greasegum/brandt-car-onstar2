# Help Endpoint Documentation

## Overview

The `/help` endpoint provides a dynamic, comprehensive overview of all available API commands with their current safety status. This endpoint is specifically designed for bot integration, allowing automated systems to understand which commands are available, their safety levels, and any confirmation requirements.

## Endpoint Details

- **URL**: `GET /help`
- **Authentication**: Not required (public endpoint)
- **Response**: JSON with complete command information

## Response Structure

```json
{
  "success": true,
  "message": "Available commands and safety status",
  "timestamp": "2025-01-04T10:30:00.000Z",
  "data": {
    "vehicle_info": {
      "make": "Chevrolet",
      "model": "Bolt EV",
      "year": 2020,
      "vin": "1G1FZ6S02L4128522"
    },
    "api_info": {
      "base_url": "http://localhost:8080",
      "authentication": "Bearer token required in Authorization header",
      "api_key": "Set API_KEY environment variable"
    },
    "safety_summary": {
      "total_commands": 15,
      "enabled_commands": 12,
      "disabled_commands": 3,
      "safe_commands": 8,
      "medium_risk_commands": 4,
      "high_risk_commands": 3,
      "confirmation_required": 2,
      "alert_endpoints_status": "DISABLED (SAFE)"
    },
    "commands": [
      {
        "command": "get_status",
        "endpoint": "GET /status",
        "description": "Get complete vehicle status",
        "parameters": {},
        "safety_level": "safe",
        "enabled": true,
        "requires_confirmation": false,
        "example": "Get status: GET /status"
      },
      {
        "command": "flash_lights",
        "endpoint": "POST /alert/lights",
        "description": "Flash vehicle lights",
        "parameters": {},
        "safety_level": "high_risk",
        "enabled": false,
        "disabled_reason": "Disabled for safety - triggers car alarm",
        "warning": "This command is disabled by default because it triggers the car alarm",
        "example": "Currently disabled for safety"
      }
    ],
    "safety_notes": [
      "Commands marked as 'high_risk' are disabled by default for safety",
      "Alert commands may trigger car alarm and disturb neighbors",
      "Commands requiring confirmation need 'confirm': true in request body"
    ],
    "bot_integration_tips": [
      "Check 'enabled' field before attempting to use a command",
      "Respect 'requires_confirmation' field and prompt user if needed",
      "Use 'safety_level' to determine if user confirmation is appropriate"
    ]
  }
}
```

## Safety Levels

### 🟢 Safe (`safe`)
- Can be executed without user confirmation
- No risk of disturbance or security issues
- Examples: `get_status`, `get_location`, `lock_doors`

### 🟡 Medium Risk (`medium`)
- May require user confirmation
- Could affect vehicle security or charging
- Examples: `unlock_doors`, `start_charging`, `stop_charging`

### 🔴 High Risk (`high_risk`)
- Disabled by default for safety
- May cause disturbance or trigger alarms
- Examples: `flash_lights`, `honk_horn`, `alert_both`

## Command Properties

Each command in the `commands` array includes:

- **command**: Friendly command name for bot use
- **endpoint**: Actual HTTP endpoint (method + path)
- **description**: Human-readable description
- **parameters**: Required/optional parameters
- **safety_level**: Risk level (`safe`, `medium`, `high_risk`)
- **enabled**: Whether the command is currently available
- **requires_confirmation**: Whether `"confirm": true` is needed
- **disabled_reason**: Why the command is disabled (if applicable)
- **warning**: Safety warning for high-risk commands
- **example**: Usage example

## Bot Integration Example

```javascript
// Load available commands
const response = await axios.get('/help');
const commands = response.data.data.commands;

// Check if a command is safe to execute
function canExecuteCommand(commandName) {
  const command = commands.find(cmd => cmd.command === commandName);
  
  if (!command) return false;
  if (!command.enabled) return false;
  if (command.safety_level === 'high_risk') return false;
  
  return true;
}

// Get safe commands only
const safeCommands = commands.filter(cmd => 
  cmd.enabled && 
  cmd.safety_level === 'safe' && 
  !cmd.requires_confirmation
);

// Execute a command with safety checks
async function executeCommand(commandName, params = {}) {
  const command = commands.find(cmd => cmd.command === commandName);
  
  if (!command || !command.enabled) {
    throw new Error(`Command ${commandName} is not available`);
  }
  
  if (command.requires_confirmation && !params.confirm) {
    params.confirm = true;
  }
  
  const [method, endpoint] = command.endpoint.split(' ');
  // Execute the actual API call...
}
```

## Dynamic Updates

The help endpoint reflects the current configuration in real-time:

- **Configuration changes**: Immediately reflected in command availability
- **Safety status**: Updates when config.json is modified
- **Confirmation requirements**: Shows current security settings

## Use Cases

### For AI Bots
- Understand which commands are available
- Determine safety levels before execution
- Handle confirmation requirements appropriately
- Provide accurate error messages for disabled commands

### For Dashboards
- Display current API capabilities
- Show safety status overview
- Monitor configuration changes

### For Development
- Test configuration changes
- Verify endpoint availability
- Debug command issues

## Security Considerations

- Help endpoint is public (no authentication required)
- Sensitive information (like VIN) is included - consider access control
- Command examples don't include actual API keys
- Safety warnings help prevent accidental misuse

## Example Usage

```bash
# Get help information
curl -X GET http://localhost:8080/help

# Check specific command availability
curl -X GET http://localhost:8080/help | jq '.data.commands[] | select(.command == "flash_lights")'

# Get only safe commands
curl -X GET http://localhost:8080/help | jq '.data.commands[] | select(.safety_level == "safe" and .enabled == true)'

# Check alert endpoints status
curl -X GET http://localhost:8080/help | jq '.data.safety_summary.alert_endpoints_status'
```

## Integration Benefits

1. **Self-Documenting**: API explains itself dynamically
2. **Safety-First**: Clear indication of risky operations
3. **Configuration-Aware**: Reflects current settings
4. **Bot-Friendly**: Structured for automated consumption
5. **Real-Time**: Always up-to-date with current configuration 