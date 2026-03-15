# Troubleshooting: "Invalid Platform App" Error

**Error:** `OAuthException: Invalid OAuth App ID`

---

## ✅ Step 1: Check Your .env File

**File:** `creator-ecosystem/backend/.env` (NOT .env.example!)

### Your current .env should have:

```bash
# Instagram OAuth Configuration
INSTAGRAM_APP_ID=YOUR_ACTUAL_APP_ID_HERE
INSTAGRAM_APP_SECRET=YOUR_ACTUAL_APP_SECRET_HERE
INSTAGRAM_REDIRECT_URI=creator-app://auth/callback
```

### ❌ Common mistakes:
```bash
# WRONG - Using example credentials
INSTAGRAM_APP_ID=1425890338984272
INSTAGRAM_APP_SECRET=728053f22f3afd135f1cc4219aa84f46

# WRONG - Mismatched redirect URI
INSTAGRAM_REDIRECT_URI=http://localhost:3001/auth/instagram/callback
```

---

## ✅ Step 2: Verify in Facebook Developer Dashboard

### Navigate to Your App Settings:

1. Go to: https://developers.facebook.com/apps/
2. Click your app
3. Go to **Settings > Basic**
   - Copy your **App ID** → Paste in `.env` as `INSTAGRAM_APP_ID`
   - Copy your **App Secret** → Paste in `.env` as `INSTAGRAM_APP_SECRET`
   
4. Go to **Instagram > API Setup**
   - Find "3. Set up Instagram business login"
   - Look for **"Valid OAuth Redirect URIs"**

### ⚠️ Critical: Register Your Redirect URI

In the "Valid OAuth Redirect URIs" field, you **MUST** register:

**For React Native (Your Case):**
```
creator-app://auth/callback
```

**Not:**
```
http://localhost:3001/auth/instagram/callback
```

---

## 🔴 Why You're Getting "Invalid Platform App"

### Reason 1: Redirect URI Mismatch ❌

| What's in Your Code | What's in Dashboard | Result |
|-------------------|-------------------|--------|
| `creator-app://auth/callback` | `http://localhost:3001/...` | ❌ **MISMATCH** → Invalid App |
| `creator-app://auth/callback` | `creator-app://auth/callback` | ✅ **MATCH** → Works |

### Reason 2: Wrong Credentials ❌

```bash
# ❌ Using example credentials from .env.example
INSTAGRAM_APP_ID=1425890338984272        # This is fake!
INSTAGRAM_APP_SECRET=728053f22f3afd135f1cc4219aa84f46  # This is fake!

# ✅ Using YOUR actual credentials
INSTAGRAM_APP_ID=YOUR_REAL_APP_ID
INSTAGRAM_APP_SECRET=YOUR_REAL_APP_SECRET
```

### Reason 3: App Not Configured ❌

Instagram product not added to your app in Dashboard

---

## ✅ Complete Setup Checklist

### 1. Get Real Credentials
- [ ] Go to https://developers.facebook.com/apps/
- [ ] Create an app or select existing app
- [ ] Copy **App ID**
- [ ] Copy **App Secret** (keep this secure!)
- [ ] Add **Instagram** product to your app

### 2. Update .env File
```bash
# Create/update: creator-ecosystem/backend/.env

# Instagram OAuth Configuration
INSTAGRAM_APP_ID=1234567890123456          # ← Your real App ID
INSTAGRAM_APP_SECRET=abcd1234efgh5678ijkl  # ← Your real App Secret
INSTAGRAM_REDIRECT_URI=creator-app://auth/callback
```

**Important:** 
- ❌ Do NOT commit .env to git
- ✅ Add .env to .gitignore
- ✅ Keep App Secret private

### 3. Register Redirect URI in Facebook Dashboard

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Go to **Instagram > API Setup > Business Login Settings**
4. Find: **Valid OAuth Redirect URIs**
5. Add: `creator-app://auth/callback`
6. **Save Changes**

### 4. Verify Settings
- [ ] App ID in code matches Dashboard
- [ ] App Secret in code matches Dashboard  
- [ ] Redirect URI registered in Dashboard
- [ ] Instagram product enabled
- [ ] App is in Development or Live mode

---

## 🔍 Debug: Verify Backend Has Correct Credentials

Run this to check your backend:

```bash
# In terminal at: creator-ecosystem/backend/
npm run dev
```

Watch console output for:

```
🔐 Generated Instagram OAuth URL: {
  appId: '1234...', 
  redirectUri: 'creator-app://auth/callback',
  authUrl: 'https://www.instagram.com/oauth/authorize?...'
}
```

✅ If you see your **real App ID** (first 4-5 digits), credentials are correct.

---

## 🚨 Step-by-Step Fix

### For React Native (Your Case):

**Step 1:** Get your credentials
```
App ID: [From Facebook Dashboard]
App Secret: [From Facebook Dashboard - Keep SECRET!]
```

**Step 2:** Create `.env` file
```bash
# File: creator-ecosystem/backend/.env
INSTAGRAM_APP_ID=YOUR_REAL_APP_ID_HERE
INSTAGRAM_APP_SECRET=YOUR_REAL_APP_SECRET_HERE
INSTAGRAM_REDIRECT_URI=creator-app://auth/callback
```

**Step 3:** Register redirect URI
```
Dashboard URL: https://developers.facebook.com/apps/
App: Your App
Settings: Instagram > API Setup > Business Login Settings
Add to Valid OAuth Redirect URIs: creator-app://auth/callback
```

**Step 4:** Restart backend
```bash
cd creator-ecosystem/backend
npm run dev
```

**Step 5:** Test login
- Click "Login with Instagram" in app
- Should see Instagram login page (NOT error)

---

## 🛠️ Common Error Messages & Fixes

### "Invalid OAuth App ID"
❌ Problem: Wrong App ID in .env or Dashboard mismatch
✅ Fix: Use REAL App ID from Dashboard, not example credentials

### "Invalid OAuth Redirect URI"  
❌ Problem: Redirect URI not registered in Dashboard
✅ Fix: Add `creator-app://auth/callback` to Valid OAuth Redirect URIs

### "The user hasn't authorized this app"
❌ Problem: App not in review or user didn't grant permissions
✅ Fix: User account must have admin/developer access to Instagram

### "This app is not available in your region"
❌ Problem: App restricted by region settings
✅ Fix: Check app Role settings in Dashboard

---

## 📋 Copy-Paste Template for .env

Replace `YOUR_XXX` with real values from Dashboard:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/creator-ecosystem

# JWT Configuration
JWT_SECRET=dev-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Instagram OAuth Configuration
# Get these from https://developers.facebook.com/apps/
INSTAGRAM_APP_ID=YOUR_REAL_APP_ID_123456789
INSTAGRAM_APP_SECRET=YOUR_REAL_APP_SECRET_abcdef123456
INSTAGRAM_REDIRECT_URI=creator-app://auth/callback

# Frontend URL
FRONTEND_URL=http://192.168.x.x:8081

# Instagram API
INSTAGRAM_API_VERSION=v18.0
INSTAGRAM_GRAPH_API_BASE_URL=https://graph.instagram.com

# Encryption
ENCRYPTION_KEY=your-encryption-key-32-chars-minimum-length
```

---

## ✅ Verification

After setup, you should see:

### Backend Output:
```
🔐 Generated Instagram OAuth URL: {
  appId: 'YOUR_REAL_ID...',
  redirectUri: 'creator-app://auth/callback',
  authUrl: 'https://www.instagram.com/oauth/authorize?client_id=...'
}
```

### Frontend Console:
```
📱 [LOGIN] Calling backend: POST /auth/instagram/init
✅ [LOGIN] Backend response received
🌐 [LOGIN] Auth URL received, length: 234
🔗 [LOGIN] Opening URL: https://www.instagram.com/oauth/authorize?...
✅ [LOGIN] Browser opened successfully
```

### Instagram Should Open:
```
https://www.instagram.com/oauth/authorize?client_id=YOUR_REAL_ID&...
```

---

## 🔐 Security Reminder

**Never commit .env file to git:**

```bash
# In .gitignore
.env
.env.local
.env.*.local
```

**Example .env should NOT have real credentials:**
```bash
# ✅ Good - Example file with placeholders
INSTAGRAM_APP_ID=YOUR_APP_ID_HERE
INSTAGRAM_APP_SECRET=YOUR_APP_SECRET_HERE
```

---

## Need Help?

If still getting error, verify:

1. **Terminal output** - Check backend console for correct App ID
2. **Dashboard settings** - Verify all fields match .env
3. **Restart services** - Kill and restart both backend and frontend
4. **Clear cache** - In browser/Expo, clear cache and reload

Contact: Check official docs at https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
