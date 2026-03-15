# Primary Account System

## Overview

Users can connect multiple social media accounts (Instagram, TikTok, YouTube, etc.). The **primary account** determines which platform's metrics are displayed by default in the app. Users can switch between their connected accounts anytime.

---

## Data Model

### User.socialAccounts Array

Each user has a `socialAccounts` array where ONE account can be marked as primary:

```typescript
{
  _id: "user123",
  email: "creator@example.com",
  socialAccounts: [
    {
      platform: "INSTAGRAM",
      platformId: "12345",
      username: "jane_insta",
      displayName: "Jane Creator",
      followerCount: 50000,
      isPrimary: true,        // ← PRIMARY ACCOUNT
      accessToken: "...",
      accountConnectedAt: "2024-03-14"
    },
    {
      platform: "TIKTOK",
      platformId: "67890",
      username: "jane_tiktok",
      followerCount: 120000,
      isPrimary: false,       // ← NOT PRIMARY
      accessToken: "...",
      accountConnectedAt: "2024-03-01"
    },
    {
      platform: "YOUTUBE",
      platformId: "UCxxx",
      username: "JaneCreates",
      followerCount: 75000,
      isPrimary: false,
      accessToken: "...",
      accountConnectedAt: "2024-02-20"
    }
  ],
  primaryAccount: {           // ← CONVENIENCE FIELD (auto-synced)
    platform: "INSTAGRAM",
    platformId: "12345"
  }
}
```

### Key Features

1. **`isPrimary: boolean`** - Marks account as primary
   - Only ONE account can have `isPrimary: true`
   - When switching, old primary is set to `false`, new one to `true`

2. **`primaryAccount` field** - Convenience reference
   - Auto-maintained via pre-save middleware
   - Quickly find which account is primary without searching array
   - Query: `User.findById(userId).select('primaryAccount')`

3. **Automatic sync on first login**
   - When user connects first social account, it's auto-set as primary
   - Subsequent accounts are not primary by default

---

## API Endpoints

### 1. Get All Accounts

```
GET /api/v1/profile/accounts

Response:
{
  "success": true,
  "data": [
    {
      "platform": "INSTAGRAM",
      "platformId": "12345",
      "username": "jane_insta",
      "displayName": "Jane Creator",
      "profilePictureUrl": "https://...",
      "followerCount": 50000
    },
    {
      "platform": "TIKTOK",
      "platformId": "67890",
      "username": "jane_tiktok",
      "displayName": "Jane TikTok",
      "profilePictureUrl": "https://...",
      "followerCount": 120000
    }
  ]
}
```

### 2. Get Primary Account Details

```
GET /api/v1/profile/primary

Response:
{
  "success": true,
  "data": {
    "platform": "INSTAGRAM",
    "platformId": "12345",
    "username": "jane_insta",
    "displayName": "Jane Creator",
    "profilePictureUrl": "https://...",
    "followerCount": 50000,
    "accountConnectedAt": "2024-03-14"
  }
}
```

### 3. Switch Primary Account

```
POST /api/v1/profile/switch

Request body:
{
  "platform": "TIKTOK",
  "platformId": "67890"
}

Response:
{
  "success": true,
  "data": {
    "platform": "TIKTOK",
    "platformId": "67890",
    "username": "jane_tiktok",
    "displayName": "Jane TikTok",
    "followerCount": 120000,
    "isPrimary": true
  },
  "message": "Switched to TIKTOK account successfully"
}
```

### 4. Get Primary Account Profile (Real-Time Metrics)

```
GET /api/v1/profile/primary/profile

Response:
{
  "success": true,
  "data": {
    "platform": "INSTAGRAM",
    "metrics": {
      "followers": 50000,
      "following": 500,
      "media_count": 250,
      "name": "Jane Creator",
      "biography": "Content Creator | Travel |..."
    }
  }
}
```

---

## Frontend Flow

### Profile Screen

```
┌─────────────────────────────────────────────────────┐
│ Primary Account: jane_insta (Instagram)            │
│ Followers: 50,000                                   │
│ [Avatar]                                            │
├─────────────────────────────────────────────────────┤
│ Connected Accounts:                                 │
│                                                     │
│ [ ] Instagram - jane_insta (50k followers)         │
│     PRIMARY ✓                                       │
│                                                     │
│ [ ] TikTok - jane_tiktok (120k followers)          │
│     [Switch to Primary]                            │
│                                                     │
│ [ ] YouTube - JaneCreates (75k followers)          │
│     [Switch to Primary]                            │
└─────────────────────────────────────────────────────┘
```

### Switch Account Flow

```
User taps "Switch to Primary" on TikTok
    ↓
POST /api/v1/profile/switch
{
  platform: "TIKTOK",
  platformId: "67890"
}
    ↓
Backend updates User.socialAccounts:
- Instagram isPrimary = false
- TikTok isPrimary = true
- primaryAccount = { platform: "TIKTOK", platformId: "67890" }
    ↓
Frontend receives success response
    ↓
Refresh dashboard with TikTok metrics
    ↓
Show toast: "Switched to jane_tiktok (TikTok)"
```

### Dashboard (Uses Primary Account)

```
App loads
    ↓
GET /api/v1/profile/primary
    ↓
Get current primary account (e.g., Instagram)
    ↓
Use Instagram token to fetch metrics
    ↓
Display: "50K followers | 250 posts | 4.2% engagement"
    ↓
User clicks "Switch Account" → Shows account switcher popup
    ↓
User selects TikTok
    ↓
POST /api/v1/profile/switch
    ↓
Dashboard re-fetches metrics with TikTok token
    ↓
Display: "120K followers | 450 videos | 8.5% engagement"
```

---

## Backend Implementation

### ProfileService Methods

```typescript
// Get primary account
const primaryAccount = await profileService.getPrimaryAccount(userId);

// Get all accounts
const allAccounts = await profileService.getAllAccounts(userId);

// Switch primary account
await profileService.switchPrimaryAccount(
  userId,
  'TIKTOK',
  '67890'
);

// Get primary account token (for API calls)
const { platform, accessToken } = await profileService.getPrimaryAccountToken(userId);

// Set first account as primary
await profileService.setAsPrimaryIfFirstAccount(userId, 'INSTAGRAM', '12345');
```

### Controller Usage

```typescript
// In controller, to fetch primary account metrics:
const primaryToken = await profileService.getPrimaryAccountToken(userId);
const service = socialMediaFactory.getService(primaryToken.platform);
const metrics = await service.getAccountMetrics(userId, primaryToken.accessToken);
```

---

## Data Flow: Login → Set Primary

### First Social Media Login
```
1. User clicks "Login with Instagram"
   ↓
2. OAuth flow completes
   ↓
3. Backend creates/updates User document:
   - Add to socialAccounts array
   ↓
4. Check if this is first account:
   - Call profileService.setAsPrimaryIfFirstAccount()
   - Sets isPrimary = true for this account
   ↓
5. User logged in, Instagram is primary
```

### Second Social Media Login
```
1. User clicks "Connect TikTok"
   ↓
2. OAuth flow completes
   ↓
3. Backend adds TikTok to socialAccounts array:
   - isPrimary = false (Instagram remains primary)
   ↓
4. Frontend shows: "TikTok connected! Currently showing Instagram metrics. [Switch] [Skip]"
```

---

## Database Queries

### Find primary account quickly
```typescript
const user = await User.findById(userId).select('primaryAccount');
const { platform, platformId } = user.primaryAccount;
```

### Find all users with Instagram as primary
```typescript
User.find({
  'socialAccounts.platform': 'INSTAGRAM',
  'socialAccounts.isPrimary': true
});
```

### Get all accounts for a user
```typescript
const user = await User.findById(userId).select('socialAccounts');
const accounts = user.socialAccounts;
```

### Switch primary account (atomic)
```typescript
await User.findByIdAndUpdate(
  userId,
  [
    {
      $set: {
        socialAccounts: {
          $map: {
            input: '$socialAccounts',
            as: 'account',
            in: {
              ...$$account,
              isPrimary: {
                $eq: [$$account.platformId, platformIdToMakePrimary]
              }
            }
          }
        }
      }
    }
  ],
  { new: true }
);
```

---

## Error Scenarios

### No Primary Account
```
GET /api/v1/profile/primary

Response (404):
{
  "success": false,
  "error": "NO_PRIMARY_ACCOUNT",
  "message": "No primary account set"
}
```

### Account Not Found
```
POST /api/v1/profile/switch
Body: { platform: "TIKTOK", platformId: "99999" }

Response (500):
{
  "success": false,
  "error": "SWITCH_ACCOUNT_FAILED",
  "message": "Social account not found: TIKTOK/99999"
}
```

### Unsupported Platform
```
POST /api/v1/profile/switch
Body: { platform: "SNAPCHAT", platformId: "123" }

Response (400):
{
  "success": false,
  "error": "UNSUPPORTED_PLATFORM",
  "message": "Platform SNAPCHAT is not supported"
}
```

---

## Caching & Performance

### Get Primary Account Token
- Used frequently when fetching metrics
- Should be cached in memory or Redis
- Key: `user:${userId}:primary_token`
- TTL: 1 hour (or until user switches)

```typescript
// In controller:
const cachedToken = await redis.get(`user:${userId}:primary_token`);
if (!cachedToken) {
    const token = await profileService.getPrimaryAccountToken(userId);
    await redis.setex(`user:${userId}:primary_token`, 3600, JSON.stringify(token));
}
```

---

## Analytics

Track which platforms creators use:

```typescript
// Most common primary platform
User.aggregate([
  { $group: { _id: '$primaryAccount.platform', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
// Result: [ { _id: 'INSTAGRAM', count: 450 }, { _id: 'TIKTOK', count: 320 }, ... ]

// Users with multiple accounts
User.aggregate([
  {
    $project: {
      accountCount: { $size: '$socialAccounts' }
    }
  },
  {
    $group: {
      _id: '$accountCount',
      users: { $sum: 1 }
    }
  }
]);
// Result: [ { _id: 1, users: 100 }, { _id: 2, users: 150 }, { _id: 3+, users: 80 } ]
```

---

## Migration from Instagram-Only

If upgrading from Instagram-only system:

```typescript
// Migrate existing users: set Instagram as primary
db.users.updateMany(
  {
    instagramAccount: { $exists: true }
  },
  [
    {
      $set: {
        socialAccounts: [
          {
            platform: 'INSTAGRAM',
            platformId: '$instagramAccount.instagramId',
            username: '$instagramAccount.username',
            displayName: '$instagramAccount.displayName',
            profilePictureUrl: '$instagramAccount.profilePictureUrl',
            bio: '$instagramAccount.bio',
            followerCount: '$instagramAccount.followerCount',
            followingCount: '$instagramAccount.followingCount',
            mediaCount: '$instagramAccount.mediaCount',
            isBusinessAccount: '$instagramAccount.isBusinessAccount',
            accessToken: '$instagramAccount.accessToken',
            refreshToken: '$instagramAccount.refreshToken',
            tokenExpiry: '$instagramAccount.tokenExpiry',
            permissions: '$instagramAccount.permissions',
            accountConnectedAt: '$instagramAccount.accountConnectedAt',
            isPrimary: true  // ← Set as primary
          }
        ],
        primaryAccount: {
          platform: 'INSTAGRAM',
          platformId: '$instagramAccount.instagramId'
        }
      }
    }
  ]
);
```

---

## Next Steps

1. ✅ Add `isPrimary` to User.socialAccounts
2. ✅ Create ProfileService
3. ✅ Create ProfileController
4. ✅ Create Profile Routes
5. ⏳ Integrate into auth flow (set first account as primary)
6. ⏳ Update app frontend with account switcher UI
7. ⏳ Add Redis caching for primary account token
8. ⏳ Update all metrics endpoints to use primary account by default
9. ⏳ Add analytics dashboards
