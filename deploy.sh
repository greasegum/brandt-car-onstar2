#!/bin/bash

# Railway Deployment Script for Brandt Car API
# This script automates the deployment process to Railway

set -e

echo "🚀 Brandt Car API - Railway Deployment Script"
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Run deployment readiness check
echo "🔍 Running deployment readiness check..."
node deployment_check.js

# Check if user is logged in to Railway
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please login:"
    railway login
fi

# Check if project is linked
echo "🔗 Checking project link..."
if ! railway status &> /dev/null; then
    echo "❌ Project not linked. Please link to Railway project:"
    echo "Run: railway link"
    exit 1
fi

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Monitor deployment in Railway dashboard"
echo "2. Set environment variables if not already set"
echo "3. Test the deployed API"
echo ""
echo "🔧 Useful commands:"
echo "  railway logs        - View deployment logs"
echo "  railway status      - Check project status"
echo "  railway shell       - Access container shell"
echo "  railway variables   - Manage environment variables"
echo ""
echo "📖 For detailed instructions, see RAILWAY_DEPLOYMENT.md" 