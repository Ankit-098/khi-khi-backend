# Instagram OAuth & API Integration - Complete Setup

## ✅ What We've Built

### 1. **Secure Token Management System**
- **Encryption:** AES-256 secure token storage
- **Decryption:** Automatic token retrieval when needed
- **Expiry Tracking:** Monitor 60-day token lifecycle
- **Helper Functions:** Simple utilities for common operations

### 2. **Instagram API Service**
- **Official Compliance:** Follows Instagram Graph API documentation
- **Pre-built Methods:** getMe(), getUserMedia(), getUserInsights()
- **Generic Wrappers:** get() and post() for custom endpoints
- **Comprehensive Logging:** Debug-friendly logs at every step

### 3. **OAuth Flow**
- **Authorization:** Instagram login endpoint integration
- **Token Exchange:** Short-lived → long-lived token conversion
- **User Management:** Multi-account support with primary account selection
- **Database Integration:** Encrypted token persistence in MongoDB

## 📁 File Structure

```
creator-ecosystem/backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts          ✅ OAuth flow + token encryption
│   │   └── instagram.examples.ts       ✅ 7 example implementations
│   │
│   ├── services/
│   │   ├── instagram.service.ts        ✅ Core API + encryption/decryption
│   │   └── instagram-token.helper.ts   ✅ Token management utilities
│   │
│   ├── models/
│   │   └── User.ts                     ✅ Multi-account social storage
│   │
│   └── routes/
│       └── auth.routes.ts              ✅ OAuth endpoints (GET + POST)
│
├── INSTAGRAM_SERVICE_README.md         ✅ Complete documentation
└── .env                                ✅ Configuration (see below)
```

## 🔐 Environment Variables (CRITICAL)

```sh
# Instagram OAuth
INSTAGRAM_APP_ID=1823366658336147
INSTAGRAM_APP_SECRET=your_app_secret_here
INSTAGRAM_REDIRECT_URI=https://your-domain/auth/instagram/callback

# Token Encryption - MUST BE 32+ CHARACTERS FOR AES-256
ENCRYPTION_KEY=your-very-secret-encryption-key-min-32-chars-for-aes-256

# Instagram API Configuration
INSTAGRAM_API_VERSION=v18.0
INSTAGRAM_GRAPH_API_BASE_URL=https://graph.instagram.com

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Server
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

## 🔄 OAuth Flow Diagram

```
┌─────────────────┐
│   User (Mobile) │
└────────┬────────┘
         │
         │ 1. Click "Login with Instagram"
         ↓
┌─────────────────────────────────┐
│  POST /auth/instagram/init      │
│  Returns: authUrl               │
└────────┬────────────────────────┘
         │
         │ 2. Opens Instagram login
         ↓
┌──────────────────────────────────┐
│ instagram.com/oauth/authorize     │
│ (User authorizes app)            │
└────────┬─────────────────────────┘
         │
         │ 3. Instagram redirects with code
         ↓
┌──────────────────────────────────┐
│  GET /auth/instagram/callback    │
│  ?code=AUTH_CODE                 │
└────────┬─────────────────────────┘
         │
         │ 4. Exchange code for token
         ↓
┌──────────────────────────────────┐
│  POST api.instagram.com/          │
│  oauth/access_token              │
│  (Short-lived token: 1 hour)     │
└────────┬─────────────────────────┘
         │
         │ 5. Exchange for long-lived token
         ↓
┌──────────────────────────────────┐
│  GET graph.instagram.com/         │
│  access_token                    │
│  (Long-lived token: 60 days)     │
└────────┬─────────────────────────┘
         │
         │ 6. Encrypt and store in DB
         ↓
┌──────────────────────────────────┐
│  MongoDB User Document           │
│  socialAccounts[{                │
│    platform: "INSTAGRAM",        │
│    accessToken: "*encrypted*",   │
│    tokenExpiry: "2026-05-13"     │
│  }]                              │
└────────┬─────────────────────────┘
         │
         │ 7. Return JWT + user info
         ↓
┌─────────────────────────────────┐
│   User Authenticated!           │
│   (Ready to access dashboard)   │
└─────────────────────────────────┘
```

## 🚀 Quick Start - For Developers

### 1. Make Your First API Call

```typescript
import { callInstagramAPI } from './services/instagram-token.helper';

// Get user's Instagram profile
const profile = await callInstagramAPI(
    mongoDbUserId,
    instagramUserId,
    'getMe'
);

console.log(profile.username);  // ✅ Works!
```

### 2. Get User's Posts

```typescript
// Get media with automatic token decryption and renewal checks
const posts = await callInstagramAPI(
    userID,
    platformId,
    'getUserMedia',
    { limit: 20 }
);

// Returns array of media objects with all metrics
console.log(posts[0].caption);
console.log(posts[0].like_count);
```

### 3. Get Performance Metrics

```typescript
// Get impressions, reach, profile views, etc.
const insights = await callInstagramAPI(
    userID,
    platformId,
    'getUserInsights',
    { metric: 'impressions' }
);
```

## 📋 Token Lifecycle Management

### Automatic In Our System:

✅ **Storage Phase:**
```
Raw Token → Encrypt (AES-256) → Stored in Database
```

✅ **Retrieval Phase:**
```
Encrypted Token (from DB) → Decrypt → Use in API calls
```

✅ **Expiry Phase:**
```
Check token expiry before API call
If expires within 7 days → Alert / Trigger refresh
If already expired → Return error (need reauthentication)
```

## 🔒 Security Checklist

- ✅ Tokens encrypted with AES-256 before storage
- ✅ Encryption key stored as environment variable
- ✅ No plain-text tokens in logs
- ✅ Token expiry tracked and validated
- ✅ Automatic error handling for expired tokens
- ✅ HTTPS required for all redirects (devtunnels/production)
- ✅ CORS properly configured

## 🧪 Testing the System

### Test OAuth Flow:

```bash
1. Open browser or mobile app
2. Click "Login with Instagram"
3. Authorize the app
4. Check logs for:
   ✅ INIT AUTH (authorization URL generated)
   ✅ GET CALLBACK (code received)
   ✅ TOKEN EXCHANGE (short & long-lived tokens acquired)
   ✅ USER INFO FETCH (profile retrieved)
   ✅ DATABASE OPERATIONS (user created/updated)
   ✅ RESPONSE SENT (JWT returned to client)
```

### Test API Calls:

```bash
# Get encrypted token status
curl "http://localhost:3001/api/instagram/token?userId=XXX&platformId=YYY"

# Get user profile
curl "http://localhost:3001/api/instagram/profile?userId=XXX&platformId=YYY"

# Get posts
curl "http://localhost:3001/api/instagram/posts?userId=XXX&platformId=YYY&limit=10"

# Get insights
curl "http://localhost:3001/api/instagram/insights?userId=XXX&platformId=YYY&metric=impressions"
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `INSTAGRAM_SERVICE_README.md` | Complete API documentation & usage guide |
| `instagram.examples.ts` | 7 ready-to-use implementation examples |
| `instagram.service.ts` | Core service with encryption & API methods |
| `instagram-token.helper.ts` | Token management & helper utilities |
| `auth.controller.ts` | OAuth flow with token encryption |

## 🔗 API Endpoints

### OAuth Flow:
- **POST `/auth/instagram/init`** - Get Instagram authorization URL
- **GET `/auth/instagram/callback`** - Handle Instagram redirect (direct flow)
- **POST `/auth/instagram/callback`** - Handle app token exchange (deep link)

### Additional Endpoints (Examples):
- **GET `/api/instagram/profile`** - Get user's profile
- **GET `/api/instagram/posts`** - Get user's media
- **GET `/api/instagram/insights`** - Get performance metrics
- **POST `/api/instagram/check-renewal`** - Check token expiry status

## 🐛 Troubleshooting

### "Token is undefined"
→ Check database for encrypted token
→ Verify ENCRYPTION_KEY in `.env` matches original key

### "API returns 400 Bad Request"
→ Check token expiry date
→ Verify redirect URI matches Facebook Developer Dashboard
→ Check query/body parameters format

### "Cannot decrypt token"
→ ENCRYPTION_KEY must be same key used to encrypt
→ Key must be at least 32 characters
→ Verify no spaces or special characters in key

### "Instagram returns error code 2"
→ Token might be expired
→ Check token expiry: `isInstagramTokenExpiringSoon()`
→ Redirect user to reauthenticate if expired

## 🎯 Next Steps

1. **Implement Dashboard:**
   - Display user's posts with metrics
   - Show performance graphs
   - Enable account switching

2. **Add Token Refresh:**
   - Implement before-expiry refresh
   - Exchange old token for new one
   - Update database with new encrypted token

3. **Multi-Platform Support:**
   - Add TikTok OAuth (same pattern)
   - Add YouTube OAuth (same pattern)
   - Reuse encryption/token logic

4. **Webhook Integration:**
   - Subscribe to Instagram webhooks
   - Real-time updates on new posts
   - Comment moderation alerts

5. **Content Publishing:**
   - Implement POST endpoints for publishing
   - Schedule posts
   - Auto-composition from multiple sources

## 📞 Support

For official Instagram API docs:
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
- https://developers.facebook.com/docs/instagram-platform/reference

For our implementation:
- Check `INSTAGRAM_SERVICE_README.md`
- See `instagram.examples.ts` for code patterns
- Review console logs (detailed at every step)

## 🎉 You're Ready!

The complete Instagram OAuth + API integration is set up with:
- ✅ Secure encrypted token storage
- ✅ Official API compliance
- ✅ Comprehensive error handling
- ✅ Detailed logging & debugging
- ✅ Multi-account support
- ✅ Token lifecycle management
- ✅ Ready-to-use helper functions
- ✅ Example implementations

Start building! 🚀
