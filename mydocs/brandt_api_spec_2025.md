# Brandt Car API Specification v2.0
**Based on OnStarJS2 Node.js Integration**

---

## 🏛️ **Overview**

A production-grade Node.js integration system that provides comprehensive control over a 2020 Chevrolet Bolt EV through GM's OnStar API, utilizing the proven OnStarJS2 library with TOTP authentication support.

**Architecture**: Node.js/Node-RED service leveraging OnStarJS2's reverse-engineered OnStar patterns, designed for single-user deployment with enterprise-grade reliability and real-time vehicle data access.

---

## ⚙️ **Technology Stack**

- **Runtime**: Node.js 18+ (tested with v22.16.0)
- **Framework**: Node-RED + OnStarJS2 library
- **Authentication**: OnStar TOTP + PIN-based privilege escalation
- **Persistence**: JSON token files (gm_tokens.json, microsoft_tokens.json)
- **HTTP Client**: Built-in OnStarJS2 client with automatic retry
- **TOTP**: Built-in TOTP support via OnStarJS2
- **Deployment**: Self-hosted Node.js environment

---

## 📚 **Dependencies**

```json
{
  "dependencies": {
    "onstarjs": "^2.6.7",
    "dotenv": "^16.0.0",
    "node-red": "^3.0.0"
  }
}

---

## 🔐 **Authentication Strategy**

### **2025 OnStar TOTP Flow**
Based on OnStarJS2's validated implementation:

1. **TOTP Generation**: Real-time code generation using stored secret with Google Authenticator
2. **Primary Authentication**: username + password + TOTP → access_token
3. **Privilege Escalation**: PIN upgrade for remote commands
4. **Token Management**: Automatic refresh with persistent storage
5. **Rate Limiting**: 30-minute minimum intervals (OnStar restriction)

### **Credential Storage**
```javascript
// .secrets Environment File
ONSTAR_USERNAME=eli.geminder@gmail.com
ONSTAR_PASSWORD=Bagger1313  
ONSTAR_PIN=4216
ONSTAR_VIN=1G1FZ6S02L4128522
ONSTAR_DEVICEID=a88b5cb1-c918-41a8-8d61-3e2c9f9d4a16
ONSTAR_TOTP_SECRET=eddm4cruou3prtnh  # Validated working with Google Authenticator
```

### **OnStarJS2 Configuration**
```javascript
const config = {
    username: process.env.ONSTAR_USERNAME,
    password: process.env.ONSTAR_PASSWORD,
    vin: process.env.ONSTAR_VIN,
    onStarPin: process.env.ONSTAR_PIN,
    onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
    deviceId: process.env.ONSTAR_DEVICEID,
    tokenLocation: './tokens/',
    checkRequestStatus: true,
    requestPollingTimeoutSeconds: 180,
    requestPollingIntervalSeconds: 10
};
```

---

## 📡 **Available Functions**

### **Vehicle Control Commands**

#### **Climate Control**
```javascript
// Start vehicle (climate preconditioning)
await onstar.start();

// Stop vehicle
await onstar.cancelStart();
```

#### **Door & Trunk Control**
```javascript
// Door controls
await onstar.lockDoor();
await onstar.unlockDoor();

// Trunk controls (validated working)
await onstar.lockTrunk();
await onstar.unlockTrunk();
```

#### **Vehicle Alerts**
```javascript
// Light alerts
await onstar.alert({ action: ["Flash"] });

// Horn alerts
await onstar.alert({ action: ["Honk"] });

// Combined alerts
await onstar.alert({ action: ["Flash", "Honk"] });

// Cancel alerts
await onstar.cancelAlert();
```

### **Vehicle Information**

#### **Real-Time Diagnostics**
```javascript
// Get specific diagnostics
await onstar.diagnostics({
    diagnosticItem: [
        "EV BATTERY LEVEL",
        "EV CHARGE STATE",
        "VEHICLE RANGE",
        "ODOMETER",
        "TIRE PRESSURE",
        "AMBIENT AIR TEMPERATURE"
    ]
});

// Get all available diagnostics
await onstar.diagnostics();
```

**Actual Response Structure** (validated):
```json
{
  "commandResponse": {
    "body": {
      "diagnosticResponse": [
        {
          "diagnosticElement": [
            {
              "name": "EV BATTERY LEVEL",
              "value": "85",
              "unit": "PERCENT"
            },
            {
              "name": "EV RANGE",
              "value": "180",
              "unit": "MILES"
            },
            {
              "name": "ODOMETER",
              "value": "12850",
              "unit": "MILES"
            }
          ]
        }
      ]
    }
  }
}
```

#### **Vehicle Location**
```javascript
await onstar.location();
```

**Response Structure**:
```json
{
  "commandResponse": {
    "body": {
      "location": {
        "latitude": 42.123456,
        "longitude": -73.654321,
        "address": "123 Main St, Chatham, NY",
        "speed": 0
      }
    }
  }
}
```

### **EV-Specific Features**

#### **Charging Profile Management**
```javascript
// Get charging profile
await onstar.getChargingProfile();

// Set charging profile
await onstar.setChargingProfile({
    chargeMode: "IMMEDIATE",
    rateType: "PEAK"
});

// Charge override
await onstar.chargeOverride({
    mode: "CHARGE_NOW"
});
```

#### **Account & Vehicle Info**
```javascript
// Get account vehicles
await onstar.getAccountVehicles();
```

### **System & Monitoring**

#### **Health Check**
```javascript
// Test system health
const onstar = OnStar.create(config);
try {
    await onstar.getAccountVehicles();
    console.log("System healthy - OnStar connection active");
} catch (error) {
    console.error("System unhealthy:", error.message);
}
```

#### **Token Status**
```javascript
// Check token files
const fs = require('fs');
const tokenFiles = ['./tokens/gm_tokens.json', './tokens/microsoft_tokens.json'];

for (const file of tokenFiles) {
    if (fs.existsSync(file)) {
        const tokens = JSON.parse(fs.readFileSync(file, 'utf8'));
        console.log(`${file}: ${tokens.access_token ? 'Valid' : 'Invalid'}`);
    }
}
```

#### **Vehicle Capabilities**
```javascript
// Supported 2020 Bolt EV Functions (validated)
const capabilities = {
    "vehicle_info": {
        "make": "Chevrolet",
        "model": "Bolt EV",
        "year": 2020,
        "vin": "1G1FZ6S02L4128522"
    },
    "supported_commands": [
        "start", "cancelStart", "lockDoor", "unlockDoor", 
        "lockTrunk", "unlockTrunk", "alert", "cancelAlert",
        "location", "diagnostics", "getChargingProfile", "setChargingProfile"
    ],
    "diagnostic_items": [
        "EV BATTERY LEVEL", "EV CHARGE STATE", "VEHICLE RANGE",
        "ODOMETER", "TIRE PRESSURE", "AMBIENT AIR TEMPERATURE",
        "INTERM VOLT BATT VOLT", "LIFETIME ENERGY USED"
    ],
    "limitations": {
        "rate_limit_minutes": 30,
        "hibernation_mode": "Vehicle may not respond when deeply sleeping"
    }
};
```

---

## 🛡️ **Security Implementation**

### **Authentication Flow**
```javascript
// OnStarJS2 handles all authentication internally
const OnStar = require('onstarjs2');

const onstar = OnStar.create({
    username: process.env.ONSTAR_USERNAME,
    password: process.env.ONSTAR_PASSWORD,
    vin: process.env.ONSTAR_VIN,
    onStarPin: process.env.ONSTAR_PIN,
    onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
    deviceId: process.env.ONSTAR_DEVICEID,
    tokenLocation: './tokens/',
    checkRequestStatus: true
});
```

### **Rate Limiting & Resilience**
- **OnStar Rate Limits**: 30-minute minimum intervals (enforced by OnStar)
- **Vehicle Hibernation**: Vehicle may not respond when deeply sleeping
- **Automatic Retry**: OnStarJS2 includes built-in retry logic
- **Token Refresh**: Automatic token refresh when needed

---

## 🔧 **OnStar API Integration**

### **OnStarJS2 Library**
The system uses the OnStarJS2 library which handles all low-level API communication:

```javascript
const OnStar = require('onstarjs2');

// The library handles:
// - TOTP generation and validation
// - Token management and refresh
// - Rate limiting and retry logic
// - Request status polling
// - Error handling and recovery
```

### **Request Configuration**
```javascript
const config = {
    // Authentication
    username: process.env.ONSTAR_USERNAME,
    password: process.env.ONSTAR_PASSWORD,
    onStarPin: process.env.ONSTAR_PIN,
    onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
    
    // Vehicle identification
    vin: process.env.ONSTAR_VIN,
    deviceId: process.env.ONSTAR_DEVICEID,
    
    // Behavior configuration
    tokenLocation: './tokens/',
    checkRequestStatus: true,
    requestPollingTimeoutSeconds: 180,
    requestPollingIntervalSeconds: 10
};
```

---

## 📊 **Monitoring & Observability**

### **Structured Logging**
```python
# BigThunderSR-inspired logging pattern
@logger.catch
async def execute_command(command: str, **kwargs):
    start_time = time.time()
    try:
        result = await onstar_client.send_command(command, **kwargs)
        execution_time = int((time.time() - start_time) * 1000)
        
        logger.info("Command executed successfully", extra={
            "command": command,
            "args": kwargs,
            "execution_time_ms": execution_time,
            "success": True
        })
        return result
        
    except Exception as e:
        logger.error("Command failed", extra={
            "command": command,
            "args": kwargs,
            "error": str(e),
            "success": False
        })
        raise
```

### **Health Monitoring Metrics**
- OnStar API response times
- Authentication token expiry tracking
- Rate limit violation detection
- Vehicle hibernation state monitoring
- Command success/failure rates

---

## 🚀 **Deployment Configuration**

### **Railway Environment**
```bash
# Authentication (Required)
ONSTAR_USERNAME=eli.geminder@gmail.com
ONSTAR_PASSWORD=Bagger1313
ONSTAR_PIN=4216
ONSTAR_VIN=1G1FZ6S02L4128522
ONSTAR_DEVICEID=a88b5cb1-c918-41a8-8d61-3e2c9f9d4a16
ONSTAR_TOTP_SECRET=eddm4cruou3prtnh

# System Configuration
API_KEY=brandt-car-boltaire-2025
FERNET_KEY=4mNmdtypVEYGFx3vp380At1P99sU_DEQsh8zQR-bG64=
DATABASE_URL=postgresql://...

# Performance Tuning (BigThunderSR Recommendations)
ONSTAR_REFRESH=1800000  # 30 minutes (OnStar rate limit)
ONSTAR_TIMEOUT=30000    # 30 seconds
LOG_LEVEL=INFO
CACHE_TTL=900           # 15 minutes for status data
```

---

## 🚀 **Railway Deployment Steps**

### **1. Railway Setup**
```bash
# Deploy to Railway (assuming you have Railway CLI)
railway login
railway link  # Link to your existing project
railway deploy

# Or deploy via GitHub integration
# Connect your GitHub repo to Railway
# Railway will auto-deploy on push
```

### **2. Environment Variables Configuration**
In your Railway dashboard, add these environment variables:

```bash
# OnStar Credentials (Required)
ONSTAR_USERNAME=eli.geminder@gmail.com
ONSTAR_PASSWORD=Bagger1313
ONSTAR_PIN=4216
ONSTAR_VIN=1G1FZ6S02L4128522
ONSTAR_DEVICEID=a88b5cb1-c918-41a8-8d61-3e2c9f9d4a16
ONSTAR_TOTP_SECRET=eddm4cruou3prtnh

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_telegram_chat_id

# System Configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=INFO
```

### **3. Butler Bot Commands Reference**
```
/status     - Get complete vehicle status
/battery    - Check battery level and range
/location   - Get current vehicle location
/climate_on - Start climate preconditioning
/climate_off- Stop climate control
/lock       - Lock all doors
/unlock     - Unlock doors
/flash      - Flash lights (find vehicle)
/schedule   - Manage automatic scheduling
/help       - Show all available commands
```

### **4. Automatic Scheduling**
The butler bot includes intelligent scheduling:

- **Winter Preconditioning**: Weekdays 7:00 AM (if temp < 40°F)
- **Summer Precooling**: Weekdays 5:30 PM (if temp > 80°F)  
- **Battery Monitoring**: Daily 6:00 PM with low battery alerts
- **Smart Duration**: Adjusts based on outside temperature

### **5. Rate Limiting Awareness**
The bot automatically handles OnStar's 30-minute rate limits:
- Commands are queued and rate-limited
- Users are notified when rate limited
- Scheduled operations respect limits
- Emergency commands have priority

### **6. Railway Health Monitoring**
```javascript
// Railway health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        bot: 'online',
        onstar: 'connected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
```

---

## 📱 **Butler Bot Usage Examples**

### **Daily Routine**
```
Morning:
- Bot automatically starts climate at 7:00 AM (if cold)
- Sends notification: "🌡️ Good morning! Started climate control"
- Auto-stops after 10 minutes

Evening:
- Daily battery report at 6:00 PM
- "🔋 Daily battery report: Level: 85%, Range: 180 miles"

On Command:
- Send "/status" to get instant vehicle status
- Send "/climate_on" for immediate preconditioning
- Send "/location" if you can't find your car
```

### **Smart Notifications**
```javascript
// Low battery alert
"⚠️ Battery level is 15% - consider charging soon"

// Extreme weather preconditioning
"🌡️ Smart climate started (15 min, -5°F outside)"

// Rate limiting notification
"⏳ Rate limited - wait 25 minutes for next command"

// System status
"🤖 Butler bot online! Type /help for commands"
```

### **Emergency Features**
```javascript
// Vehicle locator
bot.onText(/\/find/, async (msg) => {
    await onstar.alert({ action: ["Flash", "Honk"] });
    const location = await onstar.location();
    bot.sendMessage(msg.chat.id, 
        `📍 Vehicle located at: ${location.address}\n` +
        `🚨 Lights flashing and horn honking for 30 seconds`
    );
});
```