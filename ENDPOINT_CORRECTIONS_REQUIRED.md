# ⚠️ CRITICAL: Endpoint Mismatch - Business Login for Instagram

**Source:** https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login

---

## 🔴 ISSUE FOUND: Wrong Authorization Endpoint

### Official Business Login Endpoints:

| Step | Official Endpoint | Your Implementation | Status |
|------|-------------------|-------------------|--------|
| 1. Authorization | `https://www.instagram.com/oauth/authorize` | `https://www.facebook.com/v18.0/dialog/oauth` | ❌ WRONG |
| 2. Exchange Token | `https://api.instagram.com/oauth/access_token` | `https://graph.instagram.com/oauth/access_token` | ❌ WRONG |
| 3. Long-lived Token | `https://graph.instagram.com/access_token` | Not implemented | ⏳ MISSING |
| 4. Refresh Token | `https://graph.instagram.com/refresh_access_token` | Not implemented | ⏳ MISSING |

---

## 📋 Official Business Login Flow (Step-by-Step)

### Step 1: Get Authorization ✅ BUT WRONG ENDPOINT

**Official:**
```
https://www.instagram.com/oauth/authorize
  ?client_id=990602627938098
  &redirect_uri=https://my.m.redirect.net/
  &response_type=code
  &scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish
```

**Your Current:**
```typescript
// ❌ WRONG - Using Facebook endpoint instead of Instagram
const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?...`
```

**Your Current File:**
[src/controllers/auth.controller.ts](src/controllers/auth.controller.ts#L54)

**⚠️ Correction Needed:**
```typescript
// ✅ CORRECT - Use Instagram endpoint
const authUrl = `https://www.instagram.com/oauth/authorize?` +
    `client_id=${INSTAGRAM_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}` +
    `&scope=${scopes.join(',')}` +
    `&response_type=code`;
    // Note: No auth_type parameter needed for Instagram endpoint
```

---

### Step 2: Exchange Code for Token ✅ BUT WRONG ENDPOINT

**Official:**
```bash
POST https://api.instagram.com/oauth/access_token
  client_id=990602627938098
  client_secret=a1b2C3D4
  grant_type=authorization_code
  redirect_uri=https://my.m.redirect.net/
  code=AQBx-hBsH3...
```

**Response:**
```json
{
  "data": [
    {
      "access_token": "EAACEdEose0...",
      "user_id": "1020...",
      "permissions": "instagram_business_basic,..."
    }
  ]
}
```

**Your Code:**
[src/controllers/auth.controller.ts](src/controllers/auth.controller.ts#L113)

```typescript
// ❌ WRONG - Using graph.instagram.com instead of api.instagram.com
const response = await queryInstagramAPI('/oauth/access_token', false, {
    POST: {
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code: code
    }
});
```

**⚠️ Correction Needed:**
```typescript
// ✅ CORRECT - Use api.instagram.com
const response = await axios.post('https://api.instagram.com/oauth/access_token', {
    client_id: INSTAGRAM_APP_ID,
    client_secret: INSTAGRAM_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    code: code
});
```

---

### Step 3: Get Long-Lived Access Token ⏳ **NOT IMPLEMENTED**

**Official Requirement:**
```
Short-lived tokens expire after 1 hour
You MUST exchange for long-lived token (60 days) for production use
```

**Official Process:**
```bash
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret=a1b2C3D4
  &access_token=EAACEdEose0...
```

**Response:**
```json
{
  "access_token": "EAACEdEose0...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

**Your Current:** ❌ NOT IMPLEMENTED

**You Need to Add:**
```typescript
// After Step 2, exchange short-lived for long-lived
const longLivedResponse = await axios.get('https://graph.instagram.com/access_token', {
    params: {
        grant_type: 'ig_exchange_token',
        client_secret: INSTAGRAM_APP_SECRET,
        access_token: shortLivedToken  // From Step 2
    }
});

const longLivedToken = longLivedResponse.data.access_token;
const expiresIn = longLivedResponse.data.expires_in; // Number of seconds (60 days)
```

---

### Step 4: Refresh Long-Lived Token ⏳ **NOT IMPLEMENTED**

**Official Requirement:**
```
Tokens valid 60 days
Must refresh before expiration
Token must be at least 24 hours old to refresh
```

**Official Process:**
```bash
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token=EAACEdEose0...
```

**Response:**
```json
{
  "access_token": "EAACEdEose0...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

---

## 🔴 Summary of Changes Needed

### Change 1: Authorization Endpoint
**File:** [src/controllers/auth.controller.ts](src/controllers/auth.controller.ts#L54)

```typescript
// ❌ CURRENT (WRONG)
const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?...`

// ✅ CORRECT
const authUrl = `https://www.instagram.com/oauth/authorize?...`
```

---

### Change 2: Token Exchange Endpoint
**File:** [src/controllers/auth.controller.ts](src/controllers/auth.controller.ts#L113)

```typescript
// ❌ CURRENT (WRONG)
const response = await queryInstagramAPI('/oauth/access_token', false, {...})

// ✅ CORRECT
const response = await axios.post('https://api.instagram.com/oauth/access_token', {...})
```

---

### Change 3: Add Long-Lived Token Exchange
**File:** [src/controllers/auth.controller.ts](src/controllers/auth.controller.ts) - After Step 2

```typescript
// ✅ NEW - Add after receiving short-lived token
const longLivedResponse = await axios.get('https://graph.instagram.com/access_token', {
    params: {
        grant_type: 'ig_exchange_token',
        client_secret: INSTAGRAM_APP_SECRET,
        access_token: shortLivedToken
    }
});

const instagramToken = longLivedResponse.data.access_token;
const tokenExpiry = new Date(Date.now() + longLivedResponse.data.expires_in * 1000);
```

---

### Change 4: Store Token Expiry
**File:** [src/models/User.ts](src/models/User.ts)

**Current:**
```typescript
interface ISocialAccount {
    platform: string;
    userId: string;
    username: string;
    accessToken: string;  // ← Just token
    isPrimary: boolean;
}
```

**Should Add:**
```typescript
interface ISocialAccount {
    platform: string;
    userId: string;
    username: string;
    accessToken: string;
    accessTokenExpiry?: Date;  // ← Add expiry tracking
    isPrimary: boolean;
}
```

---

## 🎯 Complete Corrected Flow

```
1. User clicks "Login with Instagram"
   ↓
2. Backend generates URL: https://www.instagram.com/oauth/authorize?...
   ↓
3. Frontend opens Instagram login page
   ↓
4. User authorizes app
   ↓
5. Redirects to: creator-app://callback?code=ABC123
   ↓
6. Frontend extracts code, calls backend
   ↓
7. Backend posts to: https://api.instagram.com/oauth/access_token
   ↓
8. Gets short-lived token
   ↓
9. Backend exchanges at: https://graph.instagram.com/access_token
   ↓
10. Gets long-lived token (60 days)
   ↓
11. Stores token + expiry in database
   ↓
12. Returns JWT to frontend
   ↓
13. Frontend can use token for 60 days
```

---

## 📊 Comparison Table

| Aspect | Official Doc | Your Impl | Issue |
|--------|-------------|----------|-------|
| Auth URL | instagram.com | facebook.com | ❌ Wrong domain |
| Token URL | api.instagram.com | graph.instagram.com | ❌ Wrong domain |
| Token Lifespan | 1 hour (short) → 60 days (long) | No tracking | ⏳ Missing exchange |
| Refresh | Yes, required | Not implemented | ⏳ Missing feature |
| Token Expiry | Must track (5183944 seconds) | Not tracked | ⏳ Missing data |

---

## 🚨 Why This Matters

1. **Short-lived tokens expire after 1 hour** - Users will get kicked out
2. **Long-lived tokens are mandatory** - For production use
3. **Token refresh is required** - Before 60-day expiry
4. **Using Facebook endpoint won't work** - Instagram Business Login requires Instagram endpoints

---

## ✅ Action Items

Priority 1 (Critical):
- [ ] Change authorization endpoint from Facebook to Instagram
- [ ] Change token exchange endpoint from graph to api.instagram.com

Priority 2 (Important):
- [ ] Add long-lived token exchange (Step 3)
- [ ] Store token expiry in database
- [ ] Add token refresh logic

Priority 3 (Enhancement):
- [ ] Auto-refresh tokens before expiry
- [ ] Handle token expiration in frontend

---

**Official Reference:** 
https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
