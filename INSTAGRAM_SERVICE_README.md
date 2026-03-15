# Instagram API Service Documentation

Complete guide to using the Instagram API with secure token management.

## Overview

The Instagram Service provides:
- 🔐 **Encrypted token storage** - AES-256 encryption for secure token persistence
- 📱 **Official API wrappers** - Pre-built methods following Instagram Graph API docs
- 🛠️ **Helper functions** - Utilities to make API calls with automatic token decryption
- 📊 **Comprehensive logging** - Debug-friendly logging at every API step

## Architecture

### Files
- **`instagram.service.ts`** - Core service with API methods and encryption/decryption
- **`instagram-token.helper.ts`** - Utility functions for token management and API calls
- **`auth.controller.ts`** - OAuth flow with token encryption before storage

### Token Flow

```
1. User authorizes via Instagram OAuth
   ↓
2. Receive long-lived access token (60 days)
   ↓
3. Encrypt token using AES-256
   ↓
4. Store encrypted token in MongoDB
   ↓
5. When making API calls:
   - Retrieve encrypted token from DB
   - Decrypt using stored encryption key
   - Use decrypted token in API calls
```

## Usage Examples

### 1. Get User Info (Get Started)

**Official Docs:** https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started

```typescript
import { callInstagramAPI } from '../services/instagram-token.helper';

// Get authenticated user's profile
const userInfo = await callInstagramAPI(
    userId,           // MongoDB user ID
    platformId,       // Instagram user ID
    'getMe'           // Method name
);

console.log(userInfo);
// {
//   user_id: "26582534158032376",
//   username: "your_instagram_handle",
//   name: "Your Name",
//   followers_count: 1000,
//   ...
// }
```

### 2. Get User's Media

**Official Docs:** https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started

```typescript
// Get user's posts (media)
const media = await callInstagramAPI(
    userId,
    platformId,
    'getUserMedia',
    { limit: 20 }  // Optional: number of items to return
);

console.log(media);
// [
//   {
//     id: "17918195224117851",
//     caption: "Post caption",
//     media_type: "IMAGE",
//     media_url: "https://...",
//     timestamp: "2026-03-14T12:00:00+0000",
//     like_count: 150,
//     comments_count: 25
//   },
//   ...
// ]
```

### 3. Get User Insights (Metrics)

```typescript
// Get impressions insights
const insights = await callInstagramAPI(
    userId,
    platformId,
    'getUserInsights',
    { metric: 'impressions' }
);

// Available metrics:
// - impressions
// - reach
// - profile_views
// - follower_count
// - etc.
```

### 4. Direct Service Usage (Without Token Helper)

If you need more control, use the service directly:

```typescript
import instagramService from '../services/instagram.service';

// You handle token decryption
const decryptedToken = instagramService.decryptToken(encryptedTokenFromDB);

// Call API method directly
const userInfo = await instagramService.getMe(decryptedToken);
```

### 5. Generic API Calls

For endpoints not yet implemented:

```typescript
// Generic GET request
const result = await callInstagramAPI(
    userId,
    platformId,
    'get',
    {
        endpoint: '/123456/insights',
        queryParams: { metric: 'reach', period: 'day' }
    }
);

// Generic POST request (for publishing)
const published = await callInstagramAPI(
    userId,
    platformId,
    'post',
    {
        endpoint: '/123456/media',
        data: {
            image_url: 'https://...',
            caption: 'Post caption'
        }
    }
);
```

## Token Management

### 1. Encrypt Token Before Storage

```typescript
// In auth controller after successful OAuth
const encryptedToken = instagramService.encryptToken(access_token);

// Store in database
user.socialAccounts.push({
    platform: 'INSTAGRAM',
    accessToken: encryptedToken,  // ✅ Encrypted
    tokenExpiry: expires_at,
    // ... other fields
});
```

### 2. Decrypt Token When Needed

```typescript
// Helper automatically handles this
const token = await getInstagramAccessToken(userId, platformId);

// Or manually
const decryptedToken = instagramService.decryptToken(encryptedFromDB);
```

### 3. Check Token Expiry

```typescript
// Check if token expires within 7 days
const expiringSoon = await isInstagramTokenExpiringsoon(userId, platformId);

if (expiringSoon) {
    console.log('⚠️  Token expiring soon, trigger refresh');
    // Implement token refresh logic
}
```

## Environment Configuration

### Required `.env` Variables

```sh
# Instagram OAuth
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=https://your-domain/auth/instagram/callback

# Token Encryption (CRITICAL: minimum 32 characters for AES-256)
ENCRYPTION_KEY=your-very-secret-encryption-key-at-least-32-chars-long-min

# API Configuration
INSTAGRAM_API_VERSION=v18.0
INSTAGRAM_GRAPH_API_BASE_URL=https://graph.instagram.com

# MongoDB
MONGO_URI=your-mongodb-connection-string
```

### Encryption Key Best Practices

⚠️ **IMPORTANT:**
- Minimum 32 characters for AES-256 encryption
- Use random string, not predictable values
- Never commit to version control
- Rotate keys periodically
- Store securely (use environment variables or secret manager)

```bash
# Generate secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Reference

### InstagramService Methods

#### `getMe(accessToken: string)`
Get authenticated user's profile information.

**Returns:** `InstagramUserInfo`
```typescript
{
    user_id: string;
    username: string;
    name?: string;
    biography?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string;
}
```

#### `getUserMedia(userId: string, accessToken: string, limit?: number)`
Get user's media posts.

**Returns:** `InstagramMediaItem[]`
```typescript
{
    id: string;
    caption?: string;
    media_type: string;  // IMAGE, VIDEO, CAROUSEL, etc.
    media_url?: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
}[]
```

#### `getUserInsights(userId: string, accessToken: string, metric?: string)`
Get user's performance metrics.

**Parameters:**
- `metric`: 'impressions' | 'reach' | 'profile_views' | 'follower_count' | etc.

#### `get(endpoint: string, accessToken: string, params?: Record<string, any>)`
Generic GET request to any Instagram API endpoint.

#### `post(endpoint: string, accessToken: string, data?: Record<string, any>)`
Generic POST request for publishing and modifications.

### Token Helper Methods

#### `getInstagramAccessToken(userId: string, platformId: string)`
Retrieve and decrypt access token from database.

#### `callInstagramAPI(...)`
Make API call with automatic token retrieval and decryption.

#### `isInstagramTokenExpiringsoon(userId: string, platformId: string)`
Check if token expires within 7 days.

## Error Handling

All methods include comprehensive error logging:

```typescript
try {
    const data = await callInstagramAPI(userId, platformId, 'getMe');
} catch (error) {
    // Logs include:
    // ❌ Error message
    // ❌ HTTP status code
    // 📋 Instagram API error response
    
    if (error.message.includes('token')) {
        // Token-related error
    } else if (error.message.includes('expired')) {
        // Token expired - need reauthentication
    }
}
```

## Logging

All API calls log detailed information:

```
🔐 Encrypting token for storage...
🔐 Decrypting token from storage...
📱 Calling Instagram API method: getMe
========== GET /me REQUEST ==========
📝 Requesting: GET /me
📝 Fields: user_id, username
✅ GET /me successful
========== GET /me COMPLETE ==========
```

## Official Documentation References

- **Get Started:** https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
- **Business Login:** https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
- **API Reference:** https://developers.facebook.com/docs/instagram-platform/reference
- **Webhooks:** https://developers.facebook.com/docs/instagram-platform/webhooks

## Security Notes

✅ **What's Secured:**
- Tokens encrypted before storage (AES-256)
- Tokens decrypted only when needed
- No plain-text tokens in logs
- Token expiry tracking

⚠️ **What You Should Do:**
- Keep `ENCRYPTION_KEY` secure
- Regularly rotate encryption keys
- Monitor token expiry dates
- Implement token refresh before 60-day expiry
- Use HTTPS for all API communication
- Validate access permissions before API calls

## Troubleshooting

### "Tried accessing nonexistent field"
- Some fields require app review
- Remove restricted fields like `email`, `website`
- Use basic fields: `id, username, name, biography, followers_count, media_count, profile_picture_url`

### "An unexpected error has occurred" (Code 2)
- Token might be invalid or expired
- Check token expiry date in database
- Check if token expires: `isInstagramTokenExpiringsoon(userId, platformId)`
- May need reauthentication

### Token Decryption Fails
- Ensure `ENCRYPTION_KEY` matches the one used to encrypt
- Check if token was encrypted before storage
- Verify encryption key length (minimum 32 chars)

### API Rate Limiting
- Implement request queuing
- Cache results when possible
- Use webhooks instead of polling
