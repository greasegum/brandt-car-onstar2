#!/bin/bash

# Chrome Fix Deployment Script
# This script helps deploy the Chrome/Playwright fix to Railway

echo "🚗 Brandt Car API - Chrome Fix Deployment"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Found Dockerfile"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   Then run: railway login"
    exit 1
fi

echo "✅ Railway CLI found"

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

echo "✅ Logged in to Railway"

# Show current project status
echo ""
echo "📊 Current Project Status:"
railway status

echo ""
echo "🔧 Deploying Chrome Fix..."

# Deploy to Railway
railway up

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🔍 Next Steps:"
echo "1. Check the deployment logs for any errors"
echo "2. Test Chrome installation:"
echo "   curl -X GET https://your-api.railway.app/debug/chrome"
echo "3. Test authentication:"
echo "   curl -X POST https://your-api.railway.app/debug/test-auth \\"
echo "     -H \"Authorization: Bearer brandt-car-boltaire-2025\""
echo "4. Test a car command:"
echo "   curl -X GET https://your-api.railway.app/status \\"
echo "     -H \"Authorization: Bearer brandt-car-boltaire-2025\""
echo ""
echo "📚 For troubleshooting, see: CHROME_TROUBLESHOOTING.md" 