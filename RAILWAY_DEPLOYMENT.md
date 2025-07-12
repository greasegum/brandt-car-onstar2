# Railway Deployment Guide

## 🚀 Deploy Brandt Car API to Railway

This guide will help you deploy the Brandt Car API with configuration system to Railway.

### Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **OnStar Credentials**: Your GM/OnStar account credentials
3. **Git Repository**: Your code should be in a Git repository

### Step 1: Prepare Your Environment Variables

You'll need to set these environment variables in Railway:

#### Required OnStar Credentials (not real)
```
ONSTAR_USERNAME=your.email@example.com
ONSTAR_PASSWORD=YourPassword123
ONSTAR_PIN=1234
ONSTAR_VIN=1G1FZ6S02L4128522
ONSTAR_DEVICEID=a88b5cb1-c918-41a8-8d61-3e2c9f9d4a16
ONSTAR_TOTP_SECRET=ABCDEFGHIJKLMNOP
```

#### API Configuration
```
API_KEY=brandt-car-boltaire-2025
ONSTAR_TOKEN_LOCATION=/app/tokens/
```

#### Database Configuration (PostgreSQL)
```
DB_HOST=your-postgres-service.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your_railway_password
DB_SSL=true
```

#### Optional Performance Settings
```
ONSTAR_REFRESH=1800000
ONSTAR_TIMEOUT=30000
LOG_LEVEL=INFO
CACHE_TTL=900
```

### Step 2: Deploy to Railway

#### Method 1: Deploy from GitHub (Recommended)

1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Environment Variables**:
   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add all the environment variables listed above

3. **Deploy**:
   - Railway will automatically detect the Dockerfile
   - The deployment will start automatically
   - Wait for build to complete (~3-5 minutes)

#### Method 2: Deploy from Local

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**:
   ```bash
   railway login
   railway link
   railway up
   ```

3. **Set Environment Variables**:
   ```bash
   railway variables set ONSTAR_USERNAME=your.email@example.com
   railway variables set ONSTAR_PASSWORD=YourPassword123
   railway variables set ONSTAR_PIN=1234
   railway variables set ONSTAR_VIN=1G1FZ6S02L4128522
   railway variables set ONSTAR_DEVICEID=a88b5cb1-c918-41a8-8d61-3e2c9f9d4a16
   railway variables set ONSTAR_TOTP_SECRET=ABCDEFGHIJKLMNOP
   railway variables set API_KEY=brandt-car-boltaire-2025
   
   # Database variables (Railway will provide these for PostgreSQL service)
   railway variables set DB_SSL=true
   ```

### Step 3: Verify Deployment

1. **Check Health**:
   ```bash
   curl https://your-app.railway.app/health
   ```

2. **Test API**:
   ```bash
   curl -X GET https://your-app.railway.app/capabilities \
     -H "Authorization: Bearer brandt-car-boltaire-2025"
   ```

3. **Check Configuration**:
   ```bash
   curl -X GET https://your-app.railway.app/capabilities \
     -H "Authorization: Bearer brandt-car-boltaire-2025" \
     | jq '.data.configuration'
   ```

### Step 4: Configure API Endpoints

The system deploys with **safe defaults** (alert endpoints disabled). To modify:

#### Option 1: Use Railway Shell (Recommended)
```bash
# Access Railway shell
railway shell

# Show current configuration
node config_manager.js show

# Apply safe preset
node config_manager.js preset safe

# Enable specific endpoints (if needed)
node config_manager.js enable doors unlock
node config_manager.js confirm doors_unlock yes
```

### Step 5: Set Up PostgreSQL Database

1. **Add PostgreSQL Service**:
   - In Railway dashboard, click "New Service"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically provide connection details

2. **Link Database to API**:
   - Railway will automatically inject database environment variables
   - The API will automatically initialize the database tables
   - Check logs for "Database logging enabled" message

3. **Verify Database Connection**:
   ```bash
   # Test analytics endpoints
   curl -X GET https://your-app.railway.app/analytics/stats \
     -H "Authorization: Bearer your-api-key"
   ```

#### Option 2: Environment-based Configuration
Add these Railway variables to override defaults:
```
CONFIG_ALERT_LIGHTS=false
CONFIG_ALERT_HORN=false
CONFIG_DOORS_UNLOCK=true
CONFIG_REQUIRE_CONFIRM_UNLOCK=true
```

### Step 6: Monitor and Maintain

#### Check Logs
```bash
railway logs
```

#### Monitor Health
Railway provides automatic health checks via the `/health` endpoint.

#### Monitor Analytics
```bash
# Get API usage statistics
curl -X GET https://your-app.railway.app/analytics/stats \
  -H "Authorization: Bearer your-api-key"

# Check recent commands
curl -X GET https://your-app.railway.app/analytics/recent \
  -H "Authorization: Bearer your-api-key"

# Monitor safety violations
curl -X GET https://your-app.railway.app/analytics/safety \
  -H "Authorization: Bearer your-api-key"
```

#### Update Configuration
```bash
# Via Railway shell
railway shell
node config_manager.js preset balanced
```

### Security Considerations

#### 🔒 Production Security Checklist

- [ ] **API Key**: Change from default `brandt-car-boltaire-2025`
- [ ] **Alert Endpoints**: Keep disabled unless specifically needed
- [ ] **Confirmation**: Enable for all unlock/charging operations
- [ ] **Rate Limiting**: Monitor logs for unusual activity
- [ ] **HTTPS**: Railway provides HTTPS automatically
- [ ] **Environment Variables**: Never commit credentials to Git

#### Recommended Production Settings
```bash
# Ultra-safe configuration
node config_manager.js preset safe

# Or balanced with confirmations
node config_manager.js preset balanced
```

### Troubleshooting

#### Common Issues

1. **OnStar Authentication Fails**:
   - Verify all credentials are correct
   - Check if 2FA/TOTP secret is valid
   - Ensure VIN and Device ID match your account

2. **Health Check Fails**:
   - Check Railway logs for errors
   - Verify OnStar connection is working
   - Test `/health` endpoint manually

3. **Configuration Not Applied**:
   - Use `railway shell` to access container
   - Run `node config_manager.js show` to verify
   - Use `/config/reload` API endpoint

4. **Playwright/Browser Issues**:
   - The Dockerfile includes Chromium dependencies
   - OnStar authentication requires browser automation
   - Check logs for browser-related errors

#### Debug Commands
```bash
# Access container
railway shell

# Check configuration
node config_manager.js show

# Test OnStar connection
node -e "console.log(require('./server.js'))"

# View logs
railway logs --tail
```

### API Usage Examples

Once deployed, use your Railway URL:

```bash
# Get vehicle status
curl -X GET https://your-app.railway.app/status \
  -H "Authorization: Bearer your-api-key"

# Lock doors (safe operation)
curl -X POST https://your-app.railway.app/doors/lock \
  -H "Authorization: Bearer your-api-key"

# Unlock doors (requires confirmation if enabled)
curl -X POST https://your-app.railway.app/doors/unlock \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

### Cost Optimization

Railway pricing is based on usage:
- **Starter Plan**: $5/month for basic usage
- **Pro Plan**: $20/month for higher usage
- **Usage-based**: CPU/RAM/Network usage

To minimize costs:
1. Use `sleepApplication: false` only if needed 24/7
2. Monitor resource usage in Railway dashboard
3. Consider request caching for frequently accessed data

### Next Steps

1. **Set up monitoring**: Use Railway's built-in metrics
2. **Configure alerts**: Set up notifications for failures
3. **Backup tokens**: OnStar tokens are stored in `/app/tokens/`
4. **Scale if needed**: Railway can auto-scale based on traffic

Your Brandt Car API is now ready for production use! 🚗✨ 