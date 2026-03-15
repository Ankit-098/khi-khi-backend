# OAuth Implementation Summary

## Overview

The Instagram OAuth integration has been fully implemented with support for:
- OAuth 2.0 authentication flow
- Multi-account management with primary account switching
- JWT-based session management
- Automatic first-account-as-primary system
- Extensible architecture for future platforms (TikTok, YouTube, etc.)

---

## New Files Created

### 1. `.env.example`
**Purpose:** Template for environment configuration

**Key Variables:**
- `INSTAGRAM_APP_ID` & `INSTAGRAM_APP_SECRET` - OAuth credentials
- `JWT_SECRET` - For signing JWT tokens
- `MONGO_URI` - Database connection
- `INSTAGRAM_REDIRECT_URI` - OAuth callback URL

**Usage:** Copy to `.env` and fill with actual values

---

### 2. `src/middleware/jwt.middleware.ts`
**Purpose:** JWT authentication and token management

**Exported Functions:**

#### `authenticateJWT(req, res, next)`
Middleware that verifies JWT token and attaches user to request

```typescript
// Usage in routes:
router.get('/protected', authenticateJWT, handler);
```

**Flow:**
1. Extract token from `Authorization: Bearer {token}` header
2. Verify token signature using `JWT_SECRET`
3. Attach decoded user to `req.user`
4. Pass to next middleware

**Response if token missing/invalid:**
```json
{
  "success": false,
  "error": "NO_TOKEN|INVALID_TOKEN|TOKEN_EXPIRED",
  "message": "..."
}
```

#### `optionalJWT(req, res, next)`
Like `authenticateJWT` but doesn't fail if token is missing
- Useful for endpoints supporting both authenticated and anonymous access

#### `authorize(requiredRoles)`
Role-based access control middleware

```typescript
// Usage:
router.post('/admin', authenticateJWT, authorize(['ADMIN']), handler);
```

#### `generateToken(userId, email, role)`
Generate a new JWT token

```typescript
const token = generateToken(user._id.toString(), user.email, user.role);
// Returns: signed JWT valid for 7 days (configurable)
```

**Token Payload:**
```json
{
  "id": "userId",
  "email": "user@example.com",
  "role": "CREATOR",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

### 3. `src/controllers/auth.controller.ts`
**Purpose:** OAuth flow and authentication handlers

**Main Methods:**

#### `initInstagramAuth()`
**Endpoint:** `POST /auth/instagram/init`

**Flow:**
1. Checks OAuth configuration (App ID, Secret, Redirect URI)
2. Builds Instagram OAuth authorization URL with scopes
3. Returns URL for frontend to redirect user to

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://api.instagram.com/oauth/authorize?...",
    "message": "Redirect user to this URL to authorize with Instagram"
  }
}
```

**Scopes Requested:**
- `instagram_business_basic` - Basic account info
- `instagram_business_content_publish` - Post content
- `instagram_business_manage_messages` - Manage DMs

#### `handleInstagramCallback(req, res)`
**Endpoint:** `POST /auth/instagram/callback`

**Input:** `{ code: string }` - Authorization code from Instagram

**Flow:**
1. Exchange code for access token via Instagram API
2. Get user info (username, followers, bio, etc.)
3. Find or create User in MongoDB
4. Add/update social account in `socialAccounts[]`
5. Set as primary if first account (via `profileService.setAsPrimaryIfFirstAccount`)
6. Generate JWT token
7. Return token + user data

**Response:**
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
      "socialAccounts": [
        {
          "platform": "INSTAGRAM",
          "username": "mycreator",
          "isPrimary": true
        }
      ]
    }
  }
}
```

**Key Features:**
- Auto-creates user on first login
- Auto-sets first account as primary
- Updates existing account if reconnecting
- Stores token in encrypted form
- Supports permission tracking

#### `refreshToken()`
**Endpoint:** `GET /auth/refresh`

**Headers:** `Authorization: Bearer {token}`

**Flow:**
1. Verifies user is authenticated
2. Looks up user in database
3. Generates new JWT token
4. Returns new token

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### `getCurrentUser()`
**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer {token}`

**Flow:**
1. Extracts user ID from JWT
2. Fetches user from database (excludes sensitive tokens)
3. Returns sanitized user data

**Response:** Same as OAuth callback but user data only

#### `logout()`
**Endpoint:** `POST /auth/logout`

Just returns success message. Actual logout is client-side (delete token).

---

## Modified Files

### 1. `src/routes/auth.routes.ts`
**Before:** Only had mock endpoint for POST `/instagram`

**After:** 
- `POST /auth/instagram/init` → Initialize OAuth
- `POST /auth/instagram/callback` → Handle callback
- `GET /auth/refresh` → Refresh token (protected)
- `GET /auth/me` → Get current user (protected)
- `POST /auth/logout` → Logout (protected)

**Changes:**
- Imports `authController` and `authenticateJWT`
- All endpoints properly documented with flow
- Error handling for missing credentials
- Uses controller methods instead of inline logic

---

### 2. `src/routes/profile.routes.ts`
**Before:** Imported non-existent `authenticate` middleware

**After:**
- Imports `authenticateJWT` from jwt.middleware
- All routes protected with proper JWT verification

**Routes:**
- `GET /profile/accounts` - All connected accounts
- `GET /profile/primary` - Current primary account
- `POST /profile/switch` - Switch primary account
- `GET /profile/primary/profile` - Primary with metrics

---

### 3. `src/index.ts`
**Before:** 
- No profile routes
- No imports for JWT

**After:**
- Imports `profileRoutes` from profile.routes
- Routes registered at `app.use('/profile', profileRoutes)`

**Full Route Structure:**
```
POST   /auth/instagram/init          → Initialize OAuth
POST   /auth/instagram/callback      → OAuth callback handler
GET    /auth/me                      → Get current user (protected)
GET    /auth/refresh                 → Refresh JWT (protected)
POST   /auth/logout                  → Logout (protected)

GET    /profile/accounts             → All accounts (protected)
GET    /profile/primary              → Primary account (protected)
POST   /profile/switch               → Switch primary (protected)
GET    /profile/primary/profile      → Primary with metrics (protected)

GET    /campaigns/*                  → Existing campaign routes
GET    /health                       → Health check
```

---

## Data Flow

### OAuth Login Flow

```
1. Frontend → POST /auth/instagram/init
   ↓
2. Backend returns { authUrl }
   ↓
3. Frontend redirects user to Instagram login page
   ↓
4. User authorizes app → Instagram redirects to callback URL with code
   ↓
5. Frontend → POST /auth/instagram/callback { code }
   ↓
6. Backend:
   a. Exchanges code for accessToken
   b. Fetches user info from Instagram API
   c. Finds/Creates User in MongoDB
   d. Creates/Updates social account
   e. Sets as primary if first account
   f. Generates JWT token
   ↓
7. Backend returns { token, user }
   ↓
8. Frontend stores token → Authenticated!
```

### Protected Endpoint Flow

```
Frontend → GET /auth/me with header:
           Authorization: Bearer {token}
           ↓
Backend:
  a. Extracts token from header
  b. Verifies signature
  c. Decodes token → gets userId
  d. Attaches user to req.user
  e. Handler executes with req.user
  ↓
Response sent with user data
```

### Account Switching Flow

```
Frontend → POST /profile/switch with:
           { platform: 'INSTAGRAM', platformId: '12345' }
           Authorization: Bearer {token}
           ↓
Backend (ProfileService):
  a. Finds user
  b. Sets all isPrimary = false
  c. Sets target account isPrimary = true
  d. Saves user
  e. Pre-save hook syncs primaryAccount field
  ↓
Response: Updated user with new primary
```

---

## Integration Points

### With Existing Services

1. **ProfileService** - Used in OAuth callback to set first account as primary
   ```typescript
   await profileService.setAsPrimaryIfFirstAccount(userId, 'INSTAGRAM', platformId);
   ```

2. **SocialMediaServiceFactory** - Ready to fetch real-time metrics for primary account
   ```typescript
   const service = socialMediaFactory.getService('INSTAGRAM');
   const metrics = await service.getAccountMetrics(userId, accessToken);
   ```

3. **User Model** - Stores all social accounts with primary flag
   ```typescript
   socialAccounts: [{
     platform: 'INSTAGRAM',
     platformId: '12345',
     username: 'creator',
     isPrimary: true,
     accessToken: '...'
   }]
   ```

---

## Security Features

### Implemented

1. **JWT Token Expiry** - Tokens expire after 7 days (configurable)
2. **Environment Configuration** - Secrets in `.env`, never hardcoded
3. **Token in Authorization Header** - Industry standard Bearer pattern
4. **No Token in Logs** - Tokens never logged
5. **Refresh Endpoint** - Get new token before expiry

### Recommended

1. **HTTPS Only** - Use HTTPS in production (not HTTP)
2. **Secure Token Storage**
   - Mobile: Secure Enclave / Keychain
   - Web: HttpOnly cookie (if possible)
   - Never in localStorage
3. **Token Rotation** - Refresh before expiry
4. **CORS Whitelist** - Only allow requests from your domains
5. **Rate Limiting** - Limit OAuth attempts to prevent abuse
6. **Monitoring** - Log failed auth attempts

---

## Environment Setup

Create `.env` file in backend root:

```env
# Required for OAuth
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3001/auth/instagram/callback

# Required for JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Required for database
MONGO_URI=mongodb://localhost:27017/creator-ecosystem

# Optional
PORT=3001
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:8081
```

Full template: See `.env.example`

---

## Testing Guide

### 1. Test OAuth Init

```bash
curl -X POST http://localhost:3001/auth/instagram/init \
  -H "Content-Type: application/json"
```

Expected: `{ success: true, data: { authUrl: "..." } }`

### 2. Get Authorization Code

1. Visit the `authUrl` returned from step 1
2. Click "Authorize"
3. Copy the `code` parameter from redirect URL

### 3. Exchange Code for Token

```bash
curl -X POST http://localhost:3001/auth/instagram/callback \
  -H "Content-Type: application/json" \
  -d '{ "code": "AUTHORIZATION_CODE_HERE" }'
```

Expected:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "...", "email": "...", ... }
  }
}
```

### 4. Test Protected Endpoint

```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer eyJ..."
```

Expected: Current user data

### 5. Switch Primary Account

```bash
curl -X POST http://localhost:3001/profile/switch \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{ "platform": "INSTAGRAM", "platformId": "NEW_ACCOUNT_ID" }'
```

---

## Next Steps

### Immediate (Ready to Implement)

1. ✅ Frontend OAuth integration (redirect to Instagram)
2. ✅ Test data collection via API (no DB changes)
3. ✅ Account switching UI in dashboard

### Short Term (1-2 weeks)

1. Add TikTok OAuth (similar to Instagram)
2. Implement token refresh scheduler
3. Add Redis caching for metrics
4. Implement rate limiting

### Medium Term (1 month)

1. Add YouTube OAuth
2. Implement real-time metric aggregation
3. Create dashboard with multi-account analytics
4. Add campaign creation with primary account

### Long Term (2+ months)

1. Add Twitter/X OAuth
2. Build influencer search by metrics
3. Implement AI-powered content suggestions
4. Add marketplace for brand campaigns

---

## Common Issues & Solutions

### Issue: "INSTAGRAM_APP_ID not configured"
**Solution:** Ensure `.env` file exists and has `INSTAGRAM_APP_ID` value

### Issue: "Redirect URI mismatch"
**Solution:** Check `.env` INSTAGRAM_REDIRECT_URI matches exactly with Meta app settings

### Issue: "Invalid authorization code"
**Solution:** Code expires after ~15 minutes. Get a fresh code from OAuth init.

### Issue: "JWT verification failed"
**Solution:** Ensure token is sent as `Authorization: Bearer TOKEN` (with space between Bearer and token)

### Issue: "Cannot set property isPrimary"
**Solution:** Make sure MongoDB User model is up to date with `isPrimary` field in SocialAccount schema

---

## API Response Format

All endpoints follow this format:

```json
{
  "success": true|false,
  "error": "ERROR_CODE" (only if success: false),
  "message": "Human readable message",
  "data": { ... } (only if success: true)
}
```

**Example Error:**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "User not authenticated"
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend                              │
│              (React Native / Web)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─→ POST /auth/instagram/init
                       ├─→ Redirect to Instagram OAuth
                       ├─→ POST /auth/instagram/callback {code}
                       │
┌──────────────────────┼──────────────────────────────────────┐
│                      │           Backend                    │
│                      ↓                                      │
│              ┌──────────────────┐                          │
│              │  auth.routes.ts  │                          │
│              └───────┬──────────┘                          │
│                      │                                     │
│              ┌───────↓──────────┐                          │
│              │ auth.controller  │                          │
│              └───────┬──────────┘                          │
│                      │                                     │
│         ┌────────────┼────────────┐                        │
│         │            │            │                        │
│    ┌────↓───┐   ┌────↓───┐  ┌───↓─────┐                   │
│    │Instagram│   │MongoDB │  │JWT      │                   │
│    │Graph API│   │User DB │  │Middleware                   │
│    └────────┘   └────────┘  └─────────┘                   │
│                      │                                     │
│         ┌────────────┼────────────┐                        │
│         │            │            │                        │
│    ┌────→───┐   ┌────→───┐  ┌───→─────┐                   │
│    │Profile │   │Primary │  │Existing  │                  │
│    │Service │   │Account │  │Services  │                  │
│    └────────┘   └────────┘  └─────────┘                   │
│                      │                                     │
│              ┌───────→──────────┐                          │
│              │ profile.routes   │ (Protected by JWT)       │
│              └──────────────────┘                          │
│                      │                                     │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ├─→ GET /profile/accounts
                       ├─→ GET /profile/primary
                       ├─→ POST /profile/switch
                       └─→ GET /profile/primary/profile

```

---

## File Structure

```
backend/
├── .env.example                          [NEW]
├── OAUTH_SETUP_GUIDE.md                 [NEW]
│
├── src/
│   ├── middleware/
│   │   ├── jwt.middleware.ts             [NEW]
│   │   └── transparency.middleware.ts    [EXISTING]
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts            [NEW]
│   │   └── profile.controller.ts         [EXISTING]
│   │
│   ├── routes/
│   │   ├── auth.routes.ts                [UPDATED]
│   │   ├── profile.routes.ts             [UPDATED]
│   │   └── campaign.routes.ts            [EXISTING]
│   │
│   ├── services/
│   │   ├── profile.service.ts            [EXISTING]
│   │   ├── ISocialMediaService.ts        [EXISTING]
│   │   ├── instagramAPI.service.ts       [EXISTING]
│   │   └── socialMediaFactory.ts         [EXISTING]
│   │
│   ├── models/
│   │   └── User.ts                       [EXISTING - updated for multi-account]
│   │
│   └── index.ts                          [UPDATED]
│
└── package.json                          [EXISTING - has all deps]
```

---

Ready to integrate with frontend! 🚀
