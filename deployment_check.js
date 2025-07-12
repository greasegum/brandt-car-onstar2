#!/usr/bin/env node

/**
 * Deployment Readiness Check for Railway
 * Validates that all necessary files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'package.json',
    'server.js',
    'config.json',
    'config_manager.js',
    'Dockerfile',
    '.dockerignore',
    'railway.json',
    'RAILWAY_DEPLOYMENT.md',
    'onstar.js',
    'deps/index.cjs'
];

const requiredEnvVars = [
    'ONSTAR_USERNAME',
    'ONSTAR_PASSWORD',
    'ONSTAR_PIN',
    'ONSTAR_VIN',
    'ONSTAR_DEVICEID',
    'ONSTAR_TOTP_SECRET'
];

function checkFiles() {
    console.log('📁 Checking required files...\n');
    
    let allFilesPresent = true;
    
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - MISSING`);
            allFilesPresent = false;
        }
    }
    
    return allFilesPresent;
}

function checkPackageJson() {
    console.log('\n📦 Checking package.json...\n');
    
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Check start script
        if (pkg.scripts && pkg.scripts.start) {
            console.log('✅ Start script defined');
        } else {
            console.log('❌ Start script missing');
            return false;
        }
        
        // Check essential dependencies
        const requiredDeps = ['express', 'onstarjs2', 'dotenv', 'cors', 'helmet'];
        let depsOk = true;
        
        for (const dep of requiredDeps) {
            if (pkg.dependencies && pkg.dependencies[dep]) {
                console.log(`✅ ${dep} dependency`);
            } else {
                console.log(`❌ ${dep} dependency missing`);
                depsOk = false;
            }
        }
        
        // Check Node.js version
        if (pkg.engines && pkg.engines.node) {
            console.log(`✅ Node.js version specified: ${pkg.engines.node}`);
        } else {
            console.log('⚠️  Node.js version not specified (recommended: >=18.0.0)');
        }
        
        return depsOk;
    } catch (error) {
        console.log('❌ Error reading package.json:', error.message);
        return false;
    }
}

function checkDockerfile() {
    console.log('\n🐳 Checking Dockerfile...\n');
    
    try {
        const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
        
        const checks = [
            { pattern: /FROM node:18-alpine/, message: 'Base image' },
            { pattern: /WORKDIR \/app/, message: 'Working directory' },
            { pattern: /COPY package\*\.json/, message: 'Package files copy' },
            { pattern: /npm ci/, message: 'Dependencies installation' },
            { pattern: /COPY config\.json/, message: 'Configuration files' },
            { pattern: /COPY server\.js/, message: 'Server file' },
            { pattern: /EXPOSE \$PORT/, message: 'Port exposure' },
            { pattern: /CMD \["node", "server\.js"\]/, message: 'Start command' }
        ];
        
        let dockerfileOk = true;
        
        for (const check of checks) {
            if (check.pattern.test(dockerfile)) {
                console.log(`✅ ${check.message}`);
            } else {
                console.log(`❌ ${check.message} - MISSING`);
                dockerfileOk = false;
            }
        }
        
        return dockerfileOk;
    } catch (error) {
        console.log('❌ Error reading Dockerfile:', error.message);
        return false;
    }
}

function checkConfiguration() {
    console.log('\n⚙️  Checking configuration system...\n');
    
    try {
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        
        // Check structure
        if (config.api_endpoints) {
            console.log('✅ API endpoints configuration');
        } else {
            console.log('❌ API endpoints configuration missing');
            return false;
        }
        
        if (config.security) {
            console.log('✅ Security configuration');
        } else {
            console.log('❌ Security configuration missing');
            return false;
        }
        
        // Check alert endpoints are disabled by default
        if (config.api_endpoints.alert && 
            !config.api_endpoints.alert.lights && 
            !config.api_endpoints.alert.horn && 
            !config.api_endpoints.alert.both) {
            console.log('✅ Alert endpoints safely disabled by default');
        } else {
            console.log('⚠️  Alert endpoints not disabled by default - consider for safety');
        }
        
        return true;
    } catch (error) {
        console.log('❌ Error reading config.json:', error.message);
        return false;
    }
}

function checkEnvironmentTemplate() {
    console.log('\n🔐 Checking environment template...\n');
    
    if (fs.existsSync('.env.example')) {
        console.log('✅ .env.example template exists');
        
        try {
            const envExample = fs.readFileSync('.env.example', 'utf8');
            
            let allVarsPresent = true;
            for (const envVar of requiredEnvVars) {
                if (envExample.includes(envVar)) {
                    console.log(`✅ ${envVar} in template`);
                } else {
                    console.log(`❌ ${envVar} missing from template`);
                    allVarsPresent = false;
                }
            }
            
            return allVarsPresent;
        } catch (error) {
            console.log('❌ Error reading .env.example:', error.message);
            return false;
        }
    } else {
        console.log('⚠️  .env.example template missing (recommended for deployment)');
        return true; // Not critical
    }
}

function checkRailwayConfig() {
    console.log('\n🚂 Checking Railway configuration...\n');
    
    try {
        const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
        
        if (railwayConfig.build && railwayConfig.build.builder === 'DOCKERFILE') {
            console.log('✅ Railway configured for Dockerfile build');
        } else {
            console.log('❌ Railway not configured for Dockerfile build');
            return false;
        }
        
        if (railwayConfig.deploy) {
            console.log('✅ Railway deployment configuration');
        } else {
            console.log('❌ Railway deployment configuration missing');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Error reading railway.json:', error.message);
        return false;
    }
}

function generateDeploymentSummary(allChecks) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DEPLOYMENT READINESS SUMMARY');
    console.log('='.repeat(60));
    
    if (allChecks.every(check => check)) {
        console.log('🎉 READY FOR DEPLOYMENT!');
        console.log('\nYour Brandt Car API is ready to deploy to Railway.');
        console.log('\nNext steps:');
        console.log('1. Push your code to GitHub');
        console.log('2. Connect repository to Railway');
        console.log('3. Set environment variables in Railway dashboard');
        console.log('4. Deploy and test!');
        console.log('\nRefer to RAILWAY_DEPLOYMENT.md for detailed instructions.');
    } else {
        console.log('❌ NOT READY FOR DEPLOYMENT');
        console.log('\nPlease fix the issues above before deploying.');
        console.log('Some files or configurations are missing.');
    }
    
    console.log('\n🔒 Security reminder:');
    console.log('- Alert endpoints are disabled by default for safety');
    console.log('- Change the default API key in production');
    console.log('- Use confirmation requirements for risky operations');
}

function main() {
    console.log('🚀 Railway Deployment Readiness Check');
    console.log('=====================================\n');
    
    const checks = [
        checkFiles(),
        checkPackageJson(),
        checkDockerfile(),
        checkConfiguration(),
        checkEnvironmentTemplate(),
        checkRailwayConfig()
    ];
    
    generateDeploymentSummary(checks);
}

if (require.main === module) {
    main();
}

module.exports = { checkFiles, checkPackageJson, checkDockerfile, checkConfiguration }; 