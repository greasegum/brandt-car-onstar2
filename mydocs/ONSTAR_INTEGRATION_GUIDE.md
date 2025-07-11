# OnStar V4. [Installation & Setup](#installation--setup)
5. [Authentication Configuration](#authentication-configuration)
6. [Understanding the System Architecture](#understanding-the-system-architecture)
7. [Available Commands & Data](#available-commands--data)
8. [Code Examples](#code-examples)
9. [Troubleshooting](#troubleshooting)
10. [Rate Limits & Best Practices](#rate-limits--best-practices)
11. [Production Deployment](#production-deployment)ntegration Guide
**Complete Guide to Using the OnStar Node.js Integration System**

---

## 📋 **Table of Contents**

1. [Quick Start for Newcomers](#quick-start-for-newcomers)
2. [Overview](#overview)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
4. [Authentication Configuration](#authentication-configuration)
5. [Understanding the System Architecture](#understanding-the-system-architecture)
6. [Available Commands & Data](#available-commands--data)
7. [Code Examples](#code-examples)
8. [Troubleshooting](#troubleshooting)
9. [Rate Limits & Best Practices](#rate-limits--best-practices)
10. [Production Deployment](#production-deployment)

---

## 🔍 **Overview**

This system provides programmatic access to GM OnStar services for supported vehicles (primarily Chevrolet, GMC, Cadillac, and Buick). It uses the OnStarJS2 library with modern TOTP (Time-based One-Time Password) authentication to communicate with your vehicle.

### **What You Can Do**
- Get real-time vehicle diagnostics (battery level, range, odometer, tire pressure)
- Control vehicle functions (lock/unlock, start/stop, lights/horn)
- Monitor charging status and schedule charging
- Get vehicle location and trip data
- Access comprehensive vehicle health information

### **Supported Vehicles**
- **Primary**: 2017+ Chevrolet Bolt EV, Volt, and other GM EVs
- **Secondary**: Most GM vehicles with OnStar subscription (2017+)
- **Regional**: US and Canadian OnStar accounts only

---

## 🚀 **Quick Start for Newcomers**

**New to this system?** Follow these steps to get up and running quickly:

1. **Check Prerequisites**: Ensure your OnStar account has "Third-Party Authenticator App" enabled
2. **Clone & Install**: `git clone` this repository and run `npm install`
3. **Configure Authentication**: Create `.secrets` file with your OnStar credentials
4. **Run Comprehensive Test**: Execute `node integration_test.js` to validate your complete setup
5. **Get Vehicle Data**: Run `node fixed_diagnostic_test.js` to see your vehicle's data
6. **Run Official Tests**: Execute `npm test` to verify Node-RED integration

**Having Issues?** Jump to the [Troubleshooting](#troubleshooting) section for common solutions.

---

## 🛠️ **Prerequisites**

### **OnStar Account Requirements**
1. **Active OnStar subscription** on your vehicle
2. **US or Canadian OnStar account** (international not supported)
3. **Third-Party Authenticator App** configured for your OnStar account
4. **Vehicle PIN** (4-digit PIN you use for OnStar calls)

### **Technical Requirements**
- **Node.js 18+** (tested with v22.16.0)
- **npm or yarn** package manager
- **Linux/macOS/Windows** development environment
- **Internet connection** for API calls

---

## 🚀 **Installation & Setup**

### **1. Clone the Repository**
```bash
git clone https://github.com/BigThunderSR/node-red-contrib-onstar2.git
cd node-red-contrib-onstar2
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Key Dependencies**
- `onstarjs2` - Main OnStar API library
- `dotenv` - Environment variable management
- `lodash` - Utility functions
- Browser automation libraries (for authentication)

---

## 🔐 **Authentication Configuration**

### **Step 1: OnStar Account Setup**

1. **Log into your OnStar account** (desktop browser recommended)
2. **Navigate to Account Settings** → **Security Settings**
3. **Enable "Third-Party Authenticator App"**
   - This option may not appear on mobile browsers
   - You'll see a QR code and setup key
4. **Set up your authenticator app** (Google Authenticator, Authy, etc.)
5. **Save the TOTP secret key** - you'll need this for configuration

### **Step 2: Generate Device ID**
Create a UUID v4 for your device:
```bash
# Online generator
https://www.uuidgenerator.net/version4

# Or use Node.js
node -e "console.log(require('crypto').randomUUID())"
```

### **Step 3: Create Environment File**
Create a `.secrets` file in your project root:
```bash
# OnStar Account Credentials
ONSTAR_USERNAME=your.email@example.com
ONSTAR_PASSWORD=YourPassword123
ONSTAR_PIN=1234
ONSTAR_VIN=1G1FZ6S02L4128522
ONSTAR_DEVICEID=a88b5cb1-c918-41a8-8d61-3e2c9f9d4a16
ONSTAR_TOTP_SECRET=ABCDEFGHIJKLMNOP

# Optional: Custom token storage location
# ONSTAR_TOKEN_LOCATION=./tokens/
```

### **Step 4: Verify Configuration**
```bash
node validate_totp.js
```

---

## 🏗️ **Understanding the System Architecture**

### **Authentication Flow**
1. **TOTP Generation**: System generates time-based codes using your secret
2. **Microsoft Authentication**: Initial login gets Microsoft tokens
3. **GM Token Exchange**: Microsoft tokens are exchanged for GM API tokens
4. **Vehicle Commands**: GM tokens authorize vehicle operations

### **Data Flow**
```
Your App → OnStarJS2 → GM API → OnStar → Vehicle
    ↓
Token Storage (Local Files)
    ↓
Response Processing → Structured Data
```

### **Token Management**
- **Microsoft Tokens**: Stored in `microsoft_tokens.json`
- **GM Tokens**: Stored in `gm_tokens.json`
- **Automatic Refresh**: Tokens refresh automatically when expired
- **Token Lifetime**: ~30 minutes for GM tokens, ~1 hour for Microsoft tokens

---

## 📊 **Available Commands & Data**

### **Vehicle Diagnostics**
```javascript
// Get specific diagnostics
await onstar.diagnostics({
    diagnosticItem: [
        "EV BATTERY LEVEL",
        "EV CHARGE STATE",
        "EV RANGE",
        "ODOMETER",
        "TIRE PRESSURE",
        "AMBIENT AIR TEMPERATURE",
        "LAST TRIP DISTANCE"
    ]
});

// Get all available diagnostics
await onstar.diagnostics();
```

### **Vehicle Control**
```javascript
// Door controls
await onstar.lockDoor();
await onstar.unlockDoor();

// Vehicle start/stop
await onstar.start();
await onstar.cancelStart();

// Alerts
await onstar.alert({ action: ["Flash"] });        // Lights only
await onstar.alert({ action: ["Honk"] });         // Horn only
await onstar.alert({ action: ["Flash", "Honk"] }); // Both
await onstar.cancelAlert();

// Location
await onstar.location();
```

### **EV-Specific Commands**
```javascript
// Charging profile
await onstar.getChargingProfile();
await onstar.setChargingProfile({
    chargeMode: "IMMEDIATE",
    rateType: "PEAK"
});

// Charge override
await onstar.chargeOverride({
    mode: "CHARGE_NOW"
});
```

---

## 💻 **Code Examples**

### **Basic Setup**
```javascript
const OnStar = require('onstarjs2');
require('dotenv').config({ path: '.secrets' });

const config = {
    username: process.env.ONSTAR_USERNAME,
    password: process.env.ONSTAR_PASSWORD,
    vin: process.env.ONSTAR_VIN,
    onStarPin: process.env.ONSTAR_PIN,
    onStarTOTP: process.env.ONSTAR_TOTP_SECRET,
    deviceId: process.env.ONSTAR_DEVICEID,
    tokenLocation: './tokens/',
    checkRequestStatus: true,
    requestPollingTimeoutSeconds: 120,
    requestPollingIntervalSeconds: 10
};

const onstar = OnStar.create(config);
```

### **Get Vehicle Status**
```javascript
async function getVehicleStatus() {
    try {
        const result = await onstar.diagnostics({
            diagnosticItem: ["EV BATTERY LEVEL", "EV RANGE", "ODOMETER"]
        });
        
        const diagnostics = result.response.data.commandResponse.body.diagnosticResponse;
        
        diagnostics.forEach(diagnostic => {
            if (diagnostic.diagnosticElement) {
                diagnostic.diagnosticElement.forEach(element => {
                    if (element.value) {
                        console.log(`${element.name}: ${element.value} ${element.unit || ''}`);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Failed to get vehicle status:', error.message);
    }
}
```

### **Extract Diagnostic Data**
```javascript
function extractDiagnosticValue(diagnostic) {
    // OnStar data is nested in diagnosticElement arrays
    if (diagnostic.diagnosticElement && diagnostic.diagnosticElement.length > 0) {
        const element = diagnostic.diagnosticElement[0];
        if (element.value !== undefined && element.value !== null) {
            return {
                name: element.name || diagnostic.name,
                value: element.value,
                unit: element.unit || '',
                status: element.status || ''
            };
        }
    }
    return null;
}
```

### **Vehicle Control Example**
```javascript
async function controlVehicle() {
    try {
        // Lock doors
        await onstar.lockDoor();
        console.log('Doors locked');
        
        // Flash lights
        await onstar.alert({ action: ["Flash"] });
        console.log('Lights flashed');
        
        // Get location
        const location = await onstar.location();
        const coords = location.response.data.commandResponse.body.location;
        console.log(`Vehicle located at: ${coords.latitude}, ${coords.longitude}`);
        
    } catch (error) {
        console.error('Vehicle control failed:', error.message);
    }
}
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **401 Unauthorized Errors**
```bash
# Check TOTP secret
node validate_totp.js

# Verify all credentials in .secrets file
# Ensure OnStar account has "Third-Party Authenticator App" enabled
```

#### **Rate Limiting (429 Errors)**
```bash
# OnStar enforces 30-minute rate limits
# Wait 30 minutes between command sequences
# Use requestPollingTimeoutSeconds to handle delays
```

#### **Vehicle Not Responding**
```bash
# Vehicle may be in hibernation mode
# Try a "wake-up" command first:
await onstar.alert({ action: ["Flash"] });
await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
// Then try your diagnostic/control command
```

#### **Token Issues**
```bash
# Delete token files to force re-authentication
rm tokens/microsoft_tokens.json
rm tokens/gm_tokens.json

# Or programmatically
const fs = require('fs');
if (fs.existsSync('./tokens/gm_tokens.json')) {
    fs.unlinkSync('./tokens/gm_tokens.json');
}
```

### **Debug Mode**
```javascript
// Enable detailed logging
const config = {
    // ... other config
    debug: true,
    requestPollingTimeoutSeconds: 180,
    requestPollingIntervalSeconds: 5
};
```

---

## ⚡ **Rate Limits & Best Practices**

### **OnStar Rate Limits**
- **30-minute intervals** between command sequences
- **Maximum 4-5 requests** after vehicle shutdown before hibernation
- **Vehicle hibernation** affects data availability

### **Best Practices**
1. **Cache diagnostic data** - don't request the same data repeatedly
2. **Use appropriate timeouts** - vehicle commands can take 30-60 seconds
3. **Handle errors gracefully** - implement retry logic with exponential backoff
4. **Respect hibernation** - vehicle may not respond when sleeping
5. **Monitor token expiration** - implement token refresh logic

### **Recommended Polling Intervals**
```javascript
const config = {
    requestPollingTimeoutSeconds: 120,      // 2 minutes max wait
    requestPollingIntervalSeconds: 10,      // Check every 10 seconds
    checkRequestStatus: true                // Enable status checking
};
```

---

## 🚀 **Production Deployment**

### **Environment Variables**
```bash
# Production environment
NODE_ENV=production
ONSTAR_USERNAME=your.email@example.com
ONSTAR_PASSWORD=SecurePassword123
ONSTAR_PIN=1234
ONSTAR_VIN=1G1FZ6S02L4128522
ONSTAR_DEVICEID=unique-device-id
ONSTAR_TOTP_SECRET=your-totp-secret
ONSTAR_TOKEN_LOCATION=/secure/path/tokens/

# Optional: Custom settings
ONSTAR_TIMEOUT=120000
ONSTAR_POLLING_INTERVAL=10000
```

### **Docker Configuration**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create token storage directory
RUN mkdir -p /app/tokens

# Set environment
ENV NODE_ENV=production
ENV ONSTAR_TOKEN_LOCATION=/app/tokens/

CMD ["node", "your-app.js"]
```

### **Security Considerations**
1. **Store credentials securely** - use environment variables or secrets management
2. **Restrict network access** - only allow necessary outbound connections
3. **Monitor for unusual activity** - log all vehicle commands
4. **Use HTTPS only** - ensure all communication is encrypted
5. **Regular token rotation** - implement token cleanup and rotation

### **Error Handling**
```javascript
async function robustVehicleControl() {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            const result = await onstar.diagnostics();
            return result;
        } catch (error) {
            attempt++;
            
            if (error.message.includes('429') || error.message.includes('rate limit')) {
                console.log('Rate limited, waiting 30 minutes...');
                await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
            } else if (attempt < maxRetries) {
                console.log(`Attempt ${attempt} failed, retrying in 30 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
            } else {
                throw error;
            }
        }
    }
}
```

---

## 📚 **Additional Resources**

### **Related Projects**
- **OnStarJS2**: https://github.com/BigThunderSR/OnStarJS
- **OnStar2MQTT**: https://github.com/BigThunderSR/onstar2mqtt
- **Home Assistant Add-on**: https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt

### **API Documentation**
- **OnStar API Endpoints**: See `brandt_api_spec_2025.md` for detailed endpoint documentation
- **Vehicle Commands**: Check `onstar.js` for all available Node-RED node types

### **Community**
- **Issues**: Report problems on the GitHub repository
- **Discussions**: Join the community discussions for tips and tricks
- **Updates**: Follow repository releases for new features

---

## 🧪 **Testing Your Setup**

### **Available Test Scripts**

#### **Core Integration Tests**
```bash
# Comprehensive system validation
node integration_test.js

# Test diagnostic data extraction (working version)
node fixed_diagnostic_test.js

# Test real diagnostic data extraction
node real_diagnostic_test.js

# Test raw API response analysis
node raw_response_analysis.js
```

#### **Basic Vehicle Tests**
```bash
# Test basic vehicle connectivity
node basic_test.js

# Test battery-specific diagnostics
node battery_test.js
```

#### **Official Node-RED Tests**
```bash
# Run the official test suite
npm test

# Individual Node-RED node tests (in /test folder)
npm test -- --grep "specific test name"
```

### **Test File Organization**

The workspace contains two types of test files:

1. **Active Test Scripts** (root directory)
   - `validate_totp.js` - TOTP authentication validation
   - `complete_auth_test.js` - Full authentication flow test
   - `fixed_diagnostic_test.js` - Working diagnostic data extraction
   - `basic_test.js` - Basic vehicle connectivity
   - `battery_test.js` - Battery-specific diagnostics

2. **Official Node-RED Tests** (`/test` directory)
   - These are the original Node-RED node tests
   - Run with `npm test`
   - Test individual node functionality

3. **Archived Experimental Scripts** (`/copilot_test_archive`)
   - Old test scripts used during development/debugging
   - Kept for reference but not recommended for daily use
   - Include various experimental approaches to authentication and data extraction

**For newcomers**: Use the active test scripts in the root directory. They represent the current working solutions.

### **Recommended Testing Sequence**
1. **Start with comprehensive validation**: `node integration_test.js`
2. **Test diagnostic extraction**: `node fixed_diagnostic_test.js`
3. **Test real diagnostic data**: `node real_diagnostic_test.js`
4. **Test basic connectivity**: `node basic_test.js`
5. **Run official tests**: `npm test`

### **🔍 Comprehensive System Validation**
```bash
# Run the complete integration test
node integration_test.js

# This test validates:
# - Environment setup
# - Authentication flow
# - Vehicle communication
# - Diagnostic data extraction
# - Token management
# - Rate limiting awareness
```

### **Verification Checklist**
- [ ] OnStar account has "Third-Party Authenticator App" enabled
- [ ] TOTP secret generates codes matching your authenticator app
- [ ] All environment variables are set correctly
- [ ] Vehicle responds to basic commands (alert/flash)
- [ ] Diagnostic data is retrieved successfully
- [ ] Tokens are stored and refreshed automatically

---

## 🔄 **Version History**

- **v2.6.7**: Current version with full TOTP support
- **v2.0+**: Major rewrite with TOTP authentication
- **v1.x**: Legacy version (deprecated)

---

## 📞 **Support**

If you encounter issues:
1. **Check this guide** for common solutions
2. **Run diagnostic tests** to isolate the problem
3. **Review error messages** for specific error codes
4. **Check rate limiting** - wait 30 minutes if getting 429 errors
5. **Verify credentials** - ensure OnStar account settings are correct

**Remember**: This is an unofficial integration. GM/OnStar may change their API at any time, potentially affecting functionality.

---

## 🎉 **System Status Summary**

### **✅ What's Working**
- **Authentication**: Full TOTP authentication flow validated
- **Vehicle Communication**: Successfully tested with 2020 Chevrolet Bolt EV
- **Diagnostic Data**: Real-time battery level, range, odometer, tire pressure extraction
- **Vehicle Controls**: Lock/unlock, start/stop, lights/horn alerts tested
- **Token Management**: Automatic token refresh and storage working
- **Node-RED Integration**: All official tests passing

### **🔧 Known Issues Resolved**
- **Diagnostic Data Bug**: Fixed nested `diagnosticElement` array parsing
- **TOTP Validation**: Confirmed working with Google Authenticator and similar apps
- **Rate Limiting**: Documented 30-minute cooldown periods
- **Token Expiration**: Automatic refresh mechanism implemented

### **🚀 Ready for Production**
This system has been thoroughly tested and validated. All major components are working correctly, and comprehensive troubleshooting documentation is available. The integration is ready for production use with proper monitoring and rate limit awareness.

---

*Last Updated: July 2025*
*System Version: OnStarJS2 v2.6.7*
*Tested with: 2020 Chevrolet Bolt EV*
