# Instagram OAuth Integration - Setup Guide

## Overview

This guide walks you through setting up Instagram OAuth authentication for the Creator Ecosystem backend. After completing this setup, users will be able to:

1. Login with their Instagram account
2. Connect multiple Instagram/social accounts
3. Automatically set the first account as primary
4. Switch between connected accounts

## Prerequisites

- Meta Developer Account (create at https://developers.facebook.com)
- Instagram Business Account
- Backend running on `http://localhost:3001` (or your production URL)

---

## Step 1: Create Meta Developer App

### 1.1 Go to Meta Developers Portal

1. Visit [developers.facebook.com](https://developers.facebook.com)
2. Login with your Meta account (or create one if needed)

### 1.2 Create a New App

1. Click **Create App** button
2. Choose **App Type**: Select **Consumer**
3. Fill in:
   - **App Name**: `Creator Ecosystem` (or your preference)
   - **App Purpose**: Select your use case
   - **App Contact Email**: Your email
4. Click **Create App**

### 1.3 Add Instagram Graph API

1. In your app dashboard, click **+ Add Product**
2. Search for **Instagram Graph API**
3. Click **Set Up** button
4. Select **Business** as your use case
5. Click **Continue**

---

## Step 2: Get Your Credentials

### 2.1 Find App ID & App Secret

1. Go to **Settings** → **Basic**
2. You'll see your **App ID** and **App Secret**
3. **Copy both values** - you'll need them for `.env`

⚠️ **Important**: Keep App Secret private! Never commit to version control.

### 2.2 Find Your Business Account

1. Go to **Settings** → **Basic**
2. Look for **Instagram Connected Account** section
3. If not connected, click **Connect Instagram Account**
4. Select or create a business account
5. **Copy the Account ID** (found in Settings → Basic)

---

## Step 3: Configure OAuth Redirect URI

### 3.1 Add Valid OAuth Redirect URIs

1. Go to **Settings** → **Basic**
2. Under **Valid OAuth Redirect URIs**, click **Add URI**

**⚠️ IMPORTANT - Meta SSL Requirement:**
- **Local Development**: `http://localhost:3001/auth/instagram/callback` ✅ (allowed for localhost only)
- **Production**: `https://yourdomain.com/auth/instagram/callback` ✅ (MUST use HTTPS)

3. Add the appropriate URL:
   ```
   http://localhost:3001/auth/instagram/callback
   ```
   (for development) OR
   ```
   https://yourdomain.com/auth/instagram/callback
   ```
   (for production - replace with your actual domain)

4. Click **Save Changes**

⚠️ **If you get "URL must use SSL and start with https":**
- Make sure you're not adding a non-localhost HTTP URL
- `http://` is ONLY allowed for `localhost` or `127.0.0.1`
- All other domains MUST use `https://`
- If developing locally, use exactly: `http://localhost:3001/auth/instagram/callback`

---

## Step 4: Get Long-Lived User Access Token (For Testing)

### 4.1 Generate Test Token

This is optional but useful for testing. In production, tokens are obtained through OAuth flow.

1. Go to **Settings** → **Basic**
2. Look for **Test Tokens** section
3. Under **instagram_business_profile**, click **Get Token**
4. Authorize the permissions
5. Copy the token

---

## Step 5: Update Backend Configuration

### 5.1 Create `.env` File

In `backend/` directory, create `.env` file:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/creator-ecosystem

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Instagram OAuth Configuration
INSTAGRAM_APP_ID=your_app_id_here
INSTAGRAM_APP_SECRET=your_app_secret_here
INSTAGRAM_REDIRECT_URI=http://localhost:3001/auth/instagram/callback

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:8081

# Instagram API Configuration
INSTAGRAM_API_VERSION=v18.0
INSTAGRAM_GRAPH_API_BASE_URL=https://graph.instagram.com
```

### 5.2 Replace Placeholders

Replace these with values from Step 2 & Step 3:
- `INSTAGRAM_APP_ID`: Your App ID from Meta
- `INSTAGRAM_APP_SECRET`: Your App Secret from Meta
- `INSTAGRAM_REDIRECT_URI`: Your callback URL
- `JWT_SECRET`: Generate a random string (32+ characters recommended)

---

## Step 6: Test OAuth Flow

### 6.1 Start Backend

```bash
cd backend
npm install
npm run dev
```

### 6.2 Test Init Endpoint

Send a POST request to get the authorization URL:

```bash
curl -X POST http://localhost:3001/auth/instagram/init \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://api.instagram.com/oauth/authorize?client_id=YOUR_APP_ID&redirect_uri=...",
    "message": "Redirect user to this URL to authorize with Instagram"
  }
}
```

### 6.3 Simulate OAuth Callback

After user authorizes on Instagram, they're redirected with an `authorization code`. Simulate this:

1. **Get Authorization Code**: Visit the auth URL from 6.2, authorize, and copy the `code` parameter from redirect URL

2. **Exchange Code for Token**:

```bash
curl -X POST http://localhost:3001/auth/instagram/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "authorization_code_from_instagram"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "creator@instagram.local",
      "name": "Creator Name",
      "role": "CREATOR",
      "primaryAccount": {
        "platform": "INSTAGRAM",
        "platformId": "12345"
      },
      "socialAccounts": [...]
    }
  }
}
```

---

## Step 7: Frontend Integration

### 7.1 Example React Native Implementation

```typescript
// Login Screen
const handleInstagramLogin = async () => {
  try {
    // Step 1: Get auth URL from backend
    const initResponse = await fetch('http://localhost:3001/auth/instagram/init', {
      method: 'POST'
    });
    const { data } = await initResponse.json();
    
    // Step 2: Open Instagram OAuth page in browser
    Linking.openURL(data.authUrl);
    
    // Step 3: Listen for callback (handled by deep link or WebView)
    // When redirected back with code parameter
    const code = getCodeFromRedirect(); // Your URL parsing logic
    
    // Step 4: Exchange code for token
    const callbackResponse = await fetch('http://localhost:3001/auth/instagram/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const { data: { token, user } } = await callbackResponse.json();
    
    // Step 5: Store token
    await AsyncStorage.setItem('auth_token', token);
    
    // Step 6: Navigate to dashboard
    navigation.navigate('Dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 7.2 Using Authenticated Endpoints

Once user has a token:

```typescript
// Get current user
const response = await fetch('http://localhost:3001/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();

// Get all social accounts
const accountsResponse = await fetch('http://localhost:3001/profile/accounts', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data: accounts } = await accountsResponse.json();

// Switch primary account
const switchResponse = await fetch('http://localhost:3001/profile/switch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    platform: 'INSTAGRAM',
    platformId: '12345'
  })
});
```

---

## Endpoint Reference

### Authentication Endpoints

#### `POST /auth/instagram/init`
Get Instagram OAuth authorization URL

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "string"
  }
}
```

#### `POST /auth/instagram/callback`
Handle OAuth callback with authorization code

**Body:**
```json
{
  "code": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": { ... }
  }
}
```

#### `GET /auth/me`
Get current user information

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "CREATOR|BRAND|AGENCY",
    "primaryAccount": { ... },
    "socialAccounts": [...]
  }
}
```

#### `GET /auth/refresh`
Refresh JWT token

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string"
  }
}
```

#### `POST /auth/logout`
Logout user (client-side cleanup signal)

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Profile Endpoints

#### `GET /profile/accounts`
Get all connected social media accounts

**Headers:** `Authorization: Bearer {token}`

#### `GET /profile/primary`
Get current primary account details

**Headers:** `Authorization: Bearer {token}`

#### `POST /profile/switch`
Switch primary social media account

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "platform": "INSTAGRAM|TIKTOK|YOUTUBE|...",
  "platformId": "string"
}
```

#### `GET /profile/primary/profile`
Get primary account profile with real-time metrics

**Headers:** `Authorization: Bearer {token}`

---

## Troubleshooting

### Issue: "URL must use SSL and start with https"

**Solution:**
- This error means you're trying to add an `http://` URL that isn't `localhost`
- **Localhost IS allowed with HTTP**: `http://localhost:3001/auth/instagram/callback` ✅
- **All other domains MUST use HTTPS**: `https://yourdomain.com/auth/instagram/callback` ✅
- Check that:
  - For local dev: Use exactly `http://localhost:3001/auth/instagram/callback` (not `http://127.0.0.1`)
  - For production: Use `https://yourdomain.com/auth/instagram/callback`
  - Domain is registered and HTTPS certificate is valid
  
**If developing locally and still getting error:**
- Clear browser cache and cookies
- Try in an incognito/private window
- Make sure your local server is running on exactly port 3001
- Double-check spelling: `localhost` not `Localhost` or `LOCALHOST`

### Issue: "Invalid OAuth configuration"

**Solution:**
- Verify `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` in `.env`
- Ensure MongoDB is running if storing data

### Issue: "Redirect URI mismatch"

**Solution:**
- Check that `INSTAGRAM_REDIRECT_URI` matches exactly with Meta App settings
- Both must have `http://` or `https://`
- Both must have same port number

### Issue: "Token exchange failed"

**Solution:**
- Verify authorization code is being sent correctly
- Check that code hasn't expired (codes expire after ~15 minutes)
- Ensure App Secret is kept private

### Issue: "MongoDB connection error"

**Solution:**
- Start MongoDB: `mongod` (or your MongoDB service)
- Or update `MONGO_URI` to point to your MongoDB instance

### Issue: "User already exists with this email"

**Solution:**
- This is normal if user has logged in before
- System will update existing account instead of creating new one

---

## Next Steps

1. ✅ Set up Instagram OAuth credentials in `.env`
2. ✅ Test OAuth flow with Step 6
3. ✅ Integrate with frontend (Step 7)
4. ⏳ Implement token refresh scheduling
5. ⏳ Add TikTok/YouTube OAuth services
6. ⏳ Implement Redis caching for API rate limiting

---

## Security Checklist

- [ ] `.env` file is in `.gitignore` (never commit secrets)
- [ ] `JWT_SECRET` is a strong random string
- [ ] Use HTTPS redirect URI in production
- [ ] Validate authorization code before exchange
- [ ] Store tokens securely in app (encrypted if possible)
- [ ] Implement token expiry refresh logic
- [ ] Add CORS whitelist for production domains
- [ ] Rotate `JWT_SECRET` periodically
- [ ] Log suspicious authentication attempts

---

## Architecture Overview

```
Frontend (React Native)
    ↓
1. POST /auth/instagram/init
    ↓
2. Get authUrl, redirect user to Instagram
    ↓
Instagram OAuth Server
    ↓
3. User authorizes → Redirected with code
    ↓
4. POST /auth/instagram/callback with code
    ↓
Backend
    ↓
5. Exchange code for accessToken (via Instagram API)
    ↓
6. Get user info from Instagram API
    ↓
7. Create/Update User in MongoDB
    ↓
8. Set first account as primary (if first login)
    ↓
9. Generate JWT token
    ↓
10. Return token + user data to frontend
    ↓
Frontend stores token, uses for authenticated requests
```

---

## Created Files

- `.env.example` - Environment template
- `src/middleware/jwt.middleware.ts` - JWT authentication & token generation
- `src/controllers/auth.controller.ts` - OAuth flow handlers
- `src/routes/auth.routes.ts` - Updated OAuth endpoints

## Modified Files

- `src/routes/profile.routes.ts` - Updated to use JWT middleware
- `src/index.ts` - Added profile routes, updated middleware

---

For questions or issues, refer to:
- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-graph-api)
- [Meta OAuth Docs](https://developers.facebook.com/docs/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
