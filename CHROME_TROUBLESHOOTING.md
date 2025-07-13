# Chrome/Playwright Troubleshooting Guide

## Issue: Car API Chrome Dependency Error

### Error Message
```
Car API error 500: Session authentication failed: Authentication failed: Failed to launch: Error: spawn /root/.cache/ms-playwright/chromium-1169/chrome-linux/chrome ENOENT
```

## Root Cause
The car API service uses Playwright for browser automation to authenticate with OnStar's web interface. The container is missing the required Chrome/Chromium binaries that Playwright needs to function.

## Solutions

### Solution 1: Updated Alpine Dockerfile (Current)
The main `Dockerfile` has been updated with:
- Additional system dependencies for Playwright
- Proper environment variables for Playwright
- System Chromium installation

### Solution 2: Debian-based Dockerfile (Alternative)
Use `Dockerfile.debian` for a more robust setup:
```bash
# Build with Debian base
docker build -f Dockerfile.debian -t brandt-car-api .
```

### Solution 3: Railway Deployment
For Railway deployment, the updated Dockerfile should work. If issues persist:

1. **Check the build logs** for any Chrome installation errors
2. **Verify environment variables** are set correctly
3. **Use the debug endpoints** to diagnose issues

## Debug Endpoints

### 1. Chrome Installation Check
```bash
curl -X GET https://your-api.railway.app/debug/chrome
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "environment": {
      "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "1",
      "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH": "/usr/bin/chromium-browser"
    },
    "chrome_checks": {
      "chromium_browser": {
        "found": true,
        "version": "Chromium 120.0.6099.109"
      },
      "playwright": {
        "found": true,
        "version": "Version 1.40.0"
      }
    }
  }
}
```

### 2. Authentication Test
```bash
curl -X POST https://your-api.railway.app/debug/test-auth \
  -H "Authorization: Bearer brandt-car-boltaire-2025"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "sessionId": "session_1234567890_abc123",
    "expiresAt": "2025-01-04T11:00:00.000Z",
    "vehicleCount": 1,
    "message": "Authentication successful - Chrome/Playwright is working correctly"
  }
}
```

## Troubleshooting Steps

### Step 1: Check Chrome Installation
```bash
# Check if Chrome/Chromium is installed
curl -X GET https://your-api.railway.app/debug/chrome
```

**If Chrome not found:**
- The Dockerfile needs to be updated
- Check build logs for installation errors
- Verify the base image supports Chrome installation

### Step 2: Test Authentication
```bash
# Test OnStar authentication
curl -X POST https://your-api.railway.app/debug/test-auth \
  -H "Authorization: Bearer brandt-car-boltaire-2025"
```

**If authentication fails:**
- Check OnStar credentials in environment variables
- Verify network connectivity to OnStar
- Check if OnStar account is active

### Step 3: Check Environment Variables
Ensure these environment variables are set in Railway:
```bash
ONSTAR_USERNAME=your.email@example.com
ONSTAR_PASSWORD=YourPassword123
ONSTAR_PIN=1234
ONSTAR_VIN=1G1FZ6S02L4128522
ONSTAR_DEVICEID=a88b5cb1-c918-41a8-8d61-3e2c9f9d4a16
ONSTAR_TOTP_SECRET=ABCDEFGHIJKLMNOP
API_KEY=brandt-car-boltaire-2025
```

### Step 4: Check Logs
Monitor the application logs for:
- Chrome launch errors
- Playwright initialization issues
- OnStar authentication errors

## Common Issues and Fixes

### Issue 1: Chrome Binary Not Found
**Error:** `ENOENT: no such file or directory, spawn chrome`
**Fix:** Update Dockerfile with proper Chrome installation

### Issue 2: Missing Dependencies
**Error:** `Failed to launch browser: missing dependencies`
**Fix:** Install additional system libraries in Dockerfile

### Issue 3: Permission Issues
**Error:** `Permission denied` when launching Chrome
**Fix:** Ensure proper file permissions and user setup

### Issue 4: Display Issues
**Error:** `No display found`
**Fix:** Set `DISPLAY=:99` environment variable

## Verification Checklist

- [ ] Chrome/Chromium is installed and accessible
- [ ] Playwright is properly configured
- [ ] Environment variables are set correctly
- [ ] OnStar credentials are valid
- [ ] Network connectivity to OnStar is working
- [ ] Authentication test passes
- [ ] Car commands work correctly

## Monitoring

### Success Indicators
- Authentication successful (no ENOENT errors)
- Session tokens generated
- Car commands returning data instead of errors
- Reduced authentication time (session reuse working)

### Log Patterns to Watch
- `Car session authentication successful`
- `Session token generated`
- `Car command executed successfully`

## Support

If issues persist after following this guide:

1. **Check Railway build logs** for detailed error information
2. **Use debug endpoints** to gather diagnostic information
3. **Verify OnStar account status** and credentials
4. **Test with alternative Dockerfile** (Debian-based)

## Related Files

- `Dockerfile` - Main Alpine-based configuration
- `Dockerfile.debian` - Alternative Debian-based configuration
- `server.js` - Debug endpoints implementation
- `session_manager.js` - Authentication logic 