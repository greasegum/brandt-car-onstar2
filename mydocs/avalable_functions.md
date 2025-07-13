## 🔧 **Complete OnStarJS2 Function List**

### **📊 Account & Authentication**
- `getAccountVehicles()` - Get list of vehicles in account

### **🔋 Vehicle Information**
- `diagnostics(options)` - Get vehicle diagnostic data
- `location()` - Get vehicle GPS location

### **�� Remote Commands**
- `lockDoor(options)` - Lock vehicle doors
- `unlockDoor(options)` - Unlock vehicle doors
- `lockTrunk(options)` - Lock vehicle trunk
- `unlockTrunk(options)` - Unlock vehicle trunk
- `start()` - Start vehicle remotely
- `cancelStart()` - Cancel remote start
- `alert(options)` - Alert vehicle (horn/lights)
- `cancelAlert()` - Cancel vehicle alert

### **⚡ EV Charging (Electric Vehicles)**
- `chargeOverride(options)` - Override charging settings
- `getChargingProfile()` - Get current charging profile
- `setChargingProfile(options)` - Set charging profile

### **🔧 Utility Functions**
- `create(config)` - Create OnStar instance (static method)

## 📦 **Node-RED Node Types Available**

The same functionality is also available as Node-RED nodes:
- `get-account-vehicles`
- `get-diagnostics`
- `lock-myvehicle`
- `unlock-myvehicle`
- `lock-mytrunk`
- `unlock-mytrunk`
- `start-myvehicle`
- `cancel-start-myvehicle`
- `alert-myvehicle`
- `alert-myvehicle-lights`
- `alert-myvehicle-horn`
- `cancel-alert-myvehicle`
- `locate-vehicle`
- `mycharge-override`
- `get-mycharge-profile`
- `set-mycharge-profile`

## 🎯 **Function Categories Summary**

| Category | Functions | Description |
|----------|-----------|-------------|
| **Account** | 1 | Vehicle account management |
| **Diagnostics** | 2 | Vehicle data and location |
| **Security** | 4 | Lock/unlock doors and trunk |
| **Remote Control** | 3 | Start/stop and alerts |
| **EV Charging** | 3 | Electric vehicle charging control |
| **Utility** | 1 | Instance creation |

## 💡 **Usage Examples**

```javascript
// Get vehicle list
const vehicles = await onstar.getAccountVehicles();

// Get diagnostics
const diagnostics = await onstar.diagnostics({
    diagnosticItem: ["EV BATTERY LEVEL", "ODOMETER"]
});

// Get location
const location = await onstar.location();

// Lock vehicle
const lockResult = await onstar.lockDoor();

// Start vehicle
const startResult = await onstar.start();

// Alert vehicle (horn)
const alertResult = await onstar.alert({ horn: true });
```

This gives you the complete picture of what's available in your OnStar integration!