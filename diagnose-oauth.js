#!/usr/bin/env node

/**
 * Instagram OAuth Setup Diagnostic
 * 
 * Run this to verify your OAuth configuration
 * Usage: node creator-ecosystem/backend/diagnose-oauth.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Instagram OAuth Configuration Diagnostic\n');
console.log('=' .repeat(60));

// Check .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('\n1. Checking .env file...');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
    
    // Read and parse .env
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match && !line.startsWith('#')) {
            envVars[match[1].trim()] = match[2].trim();
        }
    });

    // Check required variables
    const required = {
        'INSTAGRAM_APP_ID': 'Instagram App ID',
        'INSTAGRAM_APP_SECRET': 'Instagram App Secret',
        'INSTAGRAM_REDIRECT_URI': 'Redirect URI'
    };

    console.log('\n2. Checking required Instagram OAuth variables...\n');

    let hasAllVars = true;

    Object.entries(required).forEach(([key, label]) => {
        const value = envVars[key];
        
        if (!value) {
            console.log(`❌ ${label} (${key}): NOT SET`);
            hasAllVars = false;
        } else {
            // Check for example/placeholder values
            const exampleAppId = '1425890338984272';
            const exampleSecret = '728053f22f3afd135f1cc4219aa84f46';
            
            if (key === 'INSTAGRAM_APP_ID' && value === exampleAppId) {
                console.log(`⚠️  ${label}: USING EXAMPLE VALUE (NOT REAL)`);
                console.log(`   Current: ${value}`);
                console.log(`   ❌ This is a fake App ID from .env.example`);
                hasAllVars = false;
            } else if (key === 'INSTAGRAM_APP_SECRET' && value === exampleSecret) {
                console.log(`⚠️  ${label}: USING EXAMPLE VALUE (NOT REAL)`);
                console.log(`   Current: ${value.substring(0, 5)}...${value.substring(value.length - 5)}`);
                console.log(`   ❌ This is a fake App Secret from .env.example`);
                hasAllVars = false;
            } else if (key === 'INSTAGRAM_REDIRECT_URI') {
                if (value === 'creator-app://auth/callback') {
                    console.log(`✅ ${label}: ${value}`);
                    console.log(`   ✓ Correct format for React Native deep linking`);
                } else if (value.includes('localhost') || value.includes('127.0.0.1')) {
                    console.log(`⚠️  ${label}: ${value}`);
                    console.log(`   ⚠️  This looks like a web server URI`);
                    console.log(`   ✓  For React Native, use: creator-app://auth/callback`);
                    hasAllVars = false;
                } else {
                    console.log(`✅ ${label}: ${value}`);
                }
            } else {
                const displayValue = key === 'INSTAGRAM_APP_SECRET' 
                    ? value.substring(0, 5) + '...' + value.substring(value.length - 5)
                    : value;
                console.log(`✅ ${label}: ${displayValue}`);
            }
        }
    });

    console.log('\n3. Configuration Status\n');
    if (hasAllVars) {
        console.log('✅ All required variables are set with REAL values!');
        console.log('   Your OAuth setup should work now.');
    } else {
        console.log('❌ Configuration incomplete or using placeholder values.');
        console.log('\n   ACTION NEEDED:');
        console.log('   1. Get REAL credentials from https://developers.facebook.com/apps/');
        console.log('   2. Update your .env file');
        console.log('   3. Verify redirect URI is registered in Dashboard');
    }

} else {
    console.log('❌ .env file NOT found!');
    console.log('\n   How to fix:');
    console.log('   1. Copy .env.example to .env:');
    console.log(`      cp ${envExamplePath} ${envPath}`);
    console.log('   2. Add your REAL Instagram credentials to .env');
    console.log('   3. Set redirect URI to: creator-app://auth/callback');
    if (fs.existsSync(envExamplePath)) {
        console.log(`\n   Example file found at: ${envExamplePath}`);
    }
}

console.log('\n4. Helpful Links\n');
console.log('📱 For React Native Setup:');
console.log('   https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login');
console.log('\n🔧 Get Your Credentials:');
console.log('   https://developers.facebook.com/apps/');
console.log('\n📚 Configuration Reference:');
console.log('   See INVALID_PLATFORM_APP_FIX.md in this directory\n');

console.log('=' .repeat(60) + '\n');
