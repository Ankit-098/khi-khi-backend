# Facebook Developer Dashboard Setup - Complete Visual Guide

## 🎯 Goal
Register your React Native app with Instagram OAuth and get credentials

---

## STEP 1: Create/Access Your App

### 1.1 Go to Facebook Developer Dashboard
- **URL:** https://developers.facebook.com/apps/
- **Click:** "Create App" or select existing app

### 1.2 App Type Selection
```
Choose: Consumer
This is required for Instagram Business Login (Instagram Login)
```

### 1.3 Fill App Information
```
App Name:           "Creator Ecosystem" (or your app name)
App Contact Email:  your-email@example.com
App Purpose:        Content Management / Social Media
```

### 1.4 Get Your App ID & Secret
```
On app dashboard sidebar:

Settings > Basic

┌─────────────────────────────────────────┐
│ App ID:      123456789012345           │ ← Copy this
│ App Secret:  abc123def456ghi789jkl...  │ ← Copy this (KEEP SECURE!)
└─────────────────────────────────────────┘
```

📝 **Save these!** You'll need them in your `.env` file.

---

## STEP 2: Add Instagram Product

### 2.1 In the Dashboard, Find "Products"
```
Left sidebar > Products

Look for: Instagram
Status: Not Added

[+ Add Product]  ← Click this
```

### 2.2 Add Instagram
```
Click "Set Up" next to Instagram Graph API
```

### 2.3 Choose Access Level
```
🔘 Standard Access (if you own the Instagram account)
or
🔘 Advanced Access (if serving other accounts)

For development/testing: Choose Standard
```

---

## STEP 3: Configure Instagram Login

### 3.1 Navigate to Instagram Settings
```
Settings > Instagram > API Setup

Look for: "3. Set up Instagram business login"
```

### 3.2 Add Valid OAuth Redirect URIs

**This is CRITICAL - must match your .env file!**

```
┌─────────────────────────────────────────────────────────┐
│ Valid OAuth Redirect URIs                               │
│                                                         │
│ [Input Field] creator-app://auth/callback              │
│                                                         │
│ [+ Add URI]  [ Save Changes ]                          │
└─────────────────────────────────────────────────────────┘
```

**For React Native, use:**
```
creator-app://auth/callback
```

**NOT for React Native (web server only):**
```
❌ http://localhost:3001/auth/instagram/callback
❌ https://yourdomain.com/auth/instagram/callback
```

### 3.3 Verify Scopes

Under "Instagram Login", check you have these scopes:
```
☑️ instagram_business_basic
☑️ instagram_business_content_publish
☑️ instagram_business_manage_messages
```

✅ All should be checked

---

## STEP 4: Setup Test Account

### 4.1 Add Test Instagram Account
```
Settings > Roles > Test Users/Apps

[+ Add Test User] 

Username/Email: your-instagram-email@example.com
Select App:     Your App
Role:           Admin (or Test User)

[Create Test Account]
```

### 4.2 Verify Account is Instagram Business Account
```
Instagram Account > Settings > Account Type

Must be: Business Account or Creator Account
(NOT personal account)
```

---

## STEP 5: Update Your Code

### 5.1 Create `.env` File

**File:** `creator-ecosystem/backend/.env`

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/creator-ecosystem

# JWT Configuration
JWT_SECRET=your-dev-secret-change-in-production
JWT_EXPIRES_IN=7d

# Instagram OAuth Configuration
# Copy from Facebook Developer Dashboard > Settings > Basic
INSTAGRAM_APP_ID=YOUR_APP_ID_FROM_DASHBOARD
INSTAGRAM_APP_SECRET=YOUR_APP_SECRET_FROM_DASHBOARD

# OAuth Redirect URI - MUST match what's registered in Dashboard
INSTAGRAM_REDIRECT_URI=creator-app://auth/callback

# Frontend URL (for redirects)
FRONTEND_URL=http://192.168.x.x:8081

# Instagram API
INSTAGRAM_API_VERSION=v18.0
INSTAGRAM_GRAPH_API_BASE_URL=https://graph.instagram.com

# Encryption
ENCRYPTION_KEY=your-32-char-minimum-encryption-key
```

### 5.2 Verify .env has REAL Values

```bash
# ❌ WRONG - Using placeholder/example values
INSTAGRAM_APP_ID=1425890338984272
INSTAGRAM_APP_SECRET=728053f22f3afd135f1cc4219aa84f46

# ✅ CORRECT - Using YOUR real credentials from Dashboard
INSTAGRAM_APP_ID=987654321098765
INSTAGRAM_APP_SECRET=xyz789abc123def456ghi789jkl012
```

---

## STEP 6: Test Your Setup

### 6.1 Run Backend
```bash
cd creator-ecosystem/backend
npm run dev

# You should see:
# 🔐 Generated Instagram OAuth URL: {
#   appId: 'YOUR_REAL_APP_ID...',
#   authUrl: 'https://www.instagram.com/oauth/authorize?...'
# }
```

### 6.2 Run Frontend
```bash
# In another terminal
cd creator-app
npx expo start

# Scan with Expo app on your phone
```

### 6.3 Test OAuth Flow
```
1. Click "Login with Instagram"
2. Should redirect to: https://www.instagram.com/oauth/authorize?...
3. Sign in with your test Instagram account
4. Grant permissions
5. Should redirect back to app with token
6. Success! ✅
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "Invalid OAuth App ID"

**Root Cause:** 
- Using example credentials from `.env.example`
- Redirect URI mismatch

**Fix:**
```bash
# Verify in terminal
node creator-ecosystem/backend/diagnose-oauth.js

# Check:
✅ INSTAGRAM_APP_ID is REAL (not 1425890338984272)
✅ INSTAGRAM_APP_SECRET is REAL (not 728053f22...)
✅ Redirect URI in Dashboard matches creator-app://auth/callback
```

### Issue 2: "Invalid Redirect URI"

**Root Cause:**
- Redirect URI not registered in Facebook Dashboard
- Using web server URI instead of app scheme

**Fix:**
1. Go to Dashboard > Instagram > API Setup
2. Find: "Valid OAuth Redirect URIs"
3. Add: `creator-app://auth/callback`
4. Save

### Issue 3: "This app is not available"

**Root Cause:**
- App not approved/not in right mode
- Account doesn't have access

**Fix:**
1. Check app is in Development Mode (not Production)
2. Verify you're the app owner
3. Add your account as Test User

### Issue 4: "Redirect from Instagram goes to wrong page"

**Root Cause:**
- React Native app scheme not configured

**Fix:**
Check [app.json](d:\\practice\\creator-app\\app.json):
```json
{
  "expo": {
    "scheme": "creator-app"
  }
}
```

---

## ✅ Verification Checklist

- [ ] Facebook App created at https://developers.facebook.com/apps/
- [ ] App ID copied from Dashboard > Settings > Basic
- [ ] App Secret copied from Dashboard > Settings > Basic
- [ ] Instagram product added to app
- [ ] OAuth Redirect URI `creator-app://auth/callback` registered in Dashboard
- [ ] `.env` file created with REAL credentials (not examples)
- [ ] Backend running with correct credentials
- [ ] Frontend app.json has `"scheme": "creator-app"`
- [ ] Test Instagram Business Account created/assigned
- [ ] Test OAuth flow works end-to-end

---

## 📱 Expected Flow

```
Frontend: Click "Login with Instagram"
  ↓
Frontend: Gets OAuth URL from backend
  ↓
Frontend: Opens Instagram login page
  ↓
User: Logs in and grants permissions
  ↓
Instagram: Redirects to creator-app://auth/callback?code=...
  ↓
Frontend: Detects redirect, extracts code
  ↓
Frontend: Sends code to backend
  ↓
Backend: Exchanges code for token
  ↓
Backend: Returns JWT to frontend
  ↓
✅ User logged in!
```

---

## 🔐 Security Checklist

- [ ] `.env` file is in `.gitignore` (never commit!)
- [ ] App Secret is never exposed in frontend code
- [ ] Using HTTPS for production (not localhost)
- [ ] Redirect URI is specific (not wildcard)
- [ ] Test accounts removed before going live
- [ ] App in Live Mode only for production

---

## 📚 Official References

- **Instagram API Docs:**
  https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login

- **Facebook App Setup:**
  https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/create-a-meta-app-with-instagram

- **App Dashboard:**
  https://developers.facebook.com/apps/

---

## 💡 Quick Troubleshooting Script

Run this to diagnose issues:

```bash
# In terminal
cd creator-ecosystem/backend
node diagnose-oauth.js
```

This checks:
- ✅ .env file exists
- ✅ Has real credentials (not examples)
- ✅ All required variables set
- ✅ Redirect URI is correct format

---

**Still having issues?** Check:
1. ✅ Ran `node diagnose-oauth.js` - what does it say?
2. ✅ Restarted backend after updating .env
3. ✅ Cleared Expo cache: `expo start --clear`
4. ✅ Verified redirect URI in Dashboard matches exactly
