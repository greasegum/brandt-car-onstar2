# API Configuration System

This document explains how to use the configuration system to control API endpoint availability and security settings.

## Configuration File: `config.json`

The `config.json` file controls which endpoints are available and their security settings.

### Endpoint Control

To disable dangerous endpoints like flash lights (which triggers the alarm):

```json
{
  "api_endpoints": {
    "alert": {
      "lights": false,
      "horn": false,
      "both": false,
      "cancel": true
    }
  }
}
```

### Security Settings

Require confirmation for potentially disruptive actions:

```json
{
  "security": {
    "require_confirmation": {
      "alert_lights": true,
      "alert_horn": true,
      "alert_both": true,
      "doors_unlock": true,
      "trunk_unlock": true
    }
  }
}
```

### Rate Limiting

Control how often certain commands can be used:

```json
{
  "security": {
    "rate_limiting": {
      "alert_commands": {
        "window_minutes": 60,
        "max_requests": 3
      },
      "door_commands": {
        "window_minutes": 15,
        "max_requests": 10
      }
    }
  }
}
```

## Usage Examples

### 1. Trying to Use a Disabled Endpoint

```bash
curl -X POST http://localhost:8080/alert/lights \
  -H "Authorization: Bearer brandt-car-boltaire-2025" \
  -H "Content-Type: application/json" \
  -d '{"duration_seconds": 30}'
```

Response:
```json
{
  "success": false,
  "message": "This endpoint has been disabled for safety reasons. Check config.json to enable.",
  "timestamp": "2025-01-04T10:30:00.000Z",
  "data": {
    "endpoint": "alert.lights",
    "enabled": false,
    "config_file": "config.json"
  }
}
```

### 2. Using an Endpoint That Requires Confirmation

```bash
# This will fail without confirmation
curl -X POST http://localhost:8080/doors/unlock \
  -H "Authorization: Bearer brandt-car-boltaire-2025" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:
```json
{
  "success": false,
  "message": "This action requires confirmation. Add 'confirm=true' to your request body.",
  "data": {
    "action": "doors_unlock",
    "requires_confirmation": true,
    "hint": "Add 'confirm: true' to your request body to proceed"
  }
}
```

```bash
# This will succeed with confirmation
curl -X POST http://localhost:8080/doors/unlock \
  -H "Authorization: Bearer brandt-car-boltaire-2025" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

### 3. Reloading Configuration

```bash
curl -X POST http://localhost:8080/config/reload \
  -H "Authorization: Bearer brandt-car-boltaire-2025"
```

### 4. Checking Current Configuration

```bash
curl -X GET http://localhost:8080/capabilities \
  -H "Authorization: Bearer brandt-car-boltaire-2025"
```

## Safety Recommendations

### High-Risk Endpoints (Disable by Default)
- `/alert/lights` - Triggers car alarm
- `/alert/horn` - Loud horn activation
- `/alert/both` - Both lights and horn

### Medium-Risk Endpoints (Require Confirmation)
- `/doors/unlock` - Security risk
- `/trunk/unlock` - Security risk
- `/charging/start` - Could affect battery management
- `/charging/stop` - Could interrupt planned charging

### Low-Risk Endpoints (Enable by Default)
- `/status` - Read-only vehicle information
- `/location` - Read-only location data
- `/diagnostics` - Read-only diagnostic data
- `/doors/lock` - Security enhancement
- `/trunk/lock` - Security enhancement

## Configuration Templates

### Ultra-Safe Configuration
```json
{
  "api_endpoints": {
    "climate": { "start": true, "stop": true },
    "doors": { "lock": true, "unlock": false },
    "trunk": { "lock": true, "unlock": false },
    "alert": { "lights": false, "horn": false, "both": false, "cancel": true },
    "status": { "get": true },
    "location": { "get": true },
    "diagnostics": { "get": true },
    "charging": { "start": false, "stop": false, "profile_get": true, "profile_set": false },
    "system": { "health": true, "capabilities": true }
  }
}
```

### Balanced Configuration
```json
{
  "api_endpoints": {
    "climate": { "start": true, "stop": true },
    "doors": { "lock": true, "unlock": true },
    "trunk": { "lock": true, "unlock": true },
    "alert": { "lights": false, "horn": false, "both": false, "cancel": true },
    "status": { "get": true },
    "location": { "get": true },
    "diagnostics": { "get": true },
    "charging": { "start": true, "stop": true, "profile_get": true, "profile_set": true },
    "system": { "health": true, "capabilities": true }
  },
  "security": {
    "require_confirmation": {
      "doors_unlock": true,
      "trunk_unlock": true,
      "charging_start": true,
      "charging_stop": true
    }
  }
}
```

## Logging

The system logs all requests and disabled endpoint attempts:

```
[REQUEST] 2025-01-04T10:30:00.000Z - POST /alert/lights - IP: 127.0.0.1
[DISABLED] 2025-01-04T10:30:00.000Z - POST /alert/lights - IP: 127.0.0.1
```

Log files are stored in `./logs/api_access.log` by default. 