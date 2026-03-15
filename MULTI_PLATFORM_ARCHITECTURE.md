# Multi-Platform Architecture Design

## Overview

The backend is designed to support multiple social media platforms (Instagram, TikTok, YouTube, Twitter, LinkedIn, Facebook) with a flexible, extensible architecture using **Strategy Pattern** and **Factory Pattern**.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Controllers/Routes                                          │
│ (/api/v1/creator/profile, /api/v1/creator/media, etc.)     │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│ Factory Pattern - SocialMediaServiceFactory                │
│ Returns platform-specific service based on platform param  │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│ ISocialMediaService Interface (Abstract)                   │
│                                                             │
│ ✅ InstagramAPIService implements ISocialMediaService      │
│ ⏳ TikTokAPIService (to be implemented)                   │
│ ⏳ YouTubeAPIService (to be implemented)                 │
│ ⏳ TwitterAPIService (to be implemented)                 │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of This Design
- **Open/Closed Principle**: Open for extension (new platforms), closed for modification
- **DRY**: Common interface means controllers don't care about platform differences
- **Testable**: Mock ISocialMediaService for unit tests
- **Scalable**: Add new platforms without touching existing code

---

## Data Models

### 1. User Model - Multi-Account Support

```typescript
{
  email: "creator@example.com",
  role: "CREATOR",
  profile: { name: "Jane Creator", ... },
  
  // Multiple social accounts per user
  socialAccounts: [
    {
      platform: "INSTAGRAM",
      platformId: "12345",
      username: "jane_creates",
      displayName: "Jane Creator",
      followerCount: 50000,
      accessToken: "...",
      refreshToken: "...",
      accountConnectedAt: "2024-03-14",
    },
    {
      platform: "TIKTOK",
      platformId: "67890",
      username: "jane_creates_tiktok",
      followerCount: 120000,
      accessToken: "...",
      ...
    },
    {
      platform: "YOUTUBE",
      platformId: "UC...",
      username: "JaneCreates",
      followerCount: 75000,
      ...
    }
  ]
}
```

**Key Index:**
```typescript
{ 'socialAccounts.platform': 1, 'socialAccounts.platformId': 1 }  // Unique per platform
```

### 2. SocialMedia Model - Platform-Agnostic Content

```typescript
{
  userId: ObjectId,
  platform: "INSTAGRAM",           // Can be any platform
  platformMediaId: "123456789",    // Unique on that platform
  mediaType: "REEL",               // POST, REEL, VIDEO, SHORTS, etc.
  caption: "...",
  mediaUrl: "https://...",
  postedAt: Date,
  hashtags: ["travel", "adventure"],
  mentions: ["@brand"],
  isSponsored: false,
  language: "en",
  location: "Paris"
}
```

**Replaces:** `InstagramMedia` (kept for backward compatibility)

### 3. SocialStats Model - Platform-Agnostic Snapshots

```typescript
{
  userId: ObjectId,
  platform: "TIKTOK",
  platformId: "67890",
  snapshotDate: "2024-03-14",
  metrics: {
    followers: 120000,
    following: 500,
    totalPosts: 450,
    totalVideos: 450,        // TikTok doesn't use "reels"
    totalReels: undefined     // Optional - only for Instagram
  }
}
```

---

## Service Interface: ISocialMediaService

All platform services implement this interface:

```typescript
interface ISocialMediaService {
  platform: string;  // 'INSTAGRAM', 'TIKTOK', etc.

  // Account metrics
  getAccountMetrics(userId, accessToken): Promise<IUserMetrics>
  
  // Media list (paginated)
  getUserMedia(userId, accessToken, limit, after?): Promise<{ media, nextCursor }>
  
  // Per-media insights
  getMediaInsights(mediaId, accessToken): Promise<IMediaInsights>
  
  // Audience data
  getAudienceDemographics(userId, accessToken): Promise<IAudienceDemographics>
  
  // Token management
  refreshAccessToken(refreshToken): Promise<{ accessToken, expiresIn }>
  validateToken(accessToken): Promise<boolean>
  
  // Platform-specific info
  getRateLimits(): { requestsPerHour, requestsPerDay }
}
```

---

## Factory Pattern - SocialMediaServiceFactory

### Usage Example:

```typescript
import socialMediaFactory from '@/services';

// Get Instagram service
const instagramService = socialMediaFactory.getService('INSTAGRAM');
const metrics = await instagramService.getAccountMetrics(userId, token);

// Get TikTok service
const tiktokService = socialMediaFactory.getService('TIKTOK');
const videos = await tiktokService.getUserMedia(userId, token);

// Check if platform supported
if (socialMediaFactory.isSupported('YOUTUBE')) {
    const youtubeService = socialMediaFactory.getService('YOUTUBE');
    // ...
}

// Get all supported platforms
const platforms = socialMediaFactory.getSupportedPlatforms();
// ['INSTAGRAM', 'TIKTOK']  (YouTube pending)
```

### Controller Example:

```typescript
// This works for ANY platform - no platform-specific logic
async getProfile(req, res) {
    const { platform } = req.query;
    
    const service = socialMediaFactory.getService(platform);
    const metrics = await service.getAccountMetrics(userId, userAccess Token);
    
    res.json(metrics);
}
```

---

## Implementing a New Platform

### Step 1: Create Platform Service

```typescript
// src/services/tiktokAPI.service.ts

import { ISocialMediaService } from './ISocialMediaService';

class TikTokAPIService implements ISocialMediaService {
    readonly platform = 'TIKTOK';
    
    async getAccountMetrics(userId, accessToken) {
        // TikTok-specific implementation
    }
    
    async getUserMedia(userId, accessToken, limit = 20, after?) {
        // Handle TikTok pagination
    }
    
    // ... implement all interface methods
    
    getRateLimits() {
        return {
            requestsPerHour: 300,   // TikTok has different limits
            requestsPerDay: 7200
        };
    }
}

export default new TikTokAPIService();
```

### Step 2: Register in Factory

```typescript
// src/services/socialMediaFactory.ts

import TikTokAPIService from './tiktokAPI.service';

constructor() {
    this.registerService(SocialPlatform.INSTAGRAM, InstagramAPIService);
    this.registerService(SocialPlatform.TIKTOK, TikTokAPIService);  // ← Add this
    // this.registerService(SocialPlatform.YOUTUBE, YouTubeAPIService);
}
```

### Step 3: Update Enums

```typescript
// User model, SocialStats model, factory - add 'TIKTOK' to enum
enum SocialPlatform {
    INSTAGRAM = 'INSTAGRAM',
    TIKTOK = 'TIKTOK',
    YOUTUBE = 'YOUTUBE',
    // ...
}
```

**That's it!** Controllers automatically support the new platform.

---

## Data Flow Examples

### Multi-Platform Dashboard

```
GET /api/v1/creator/stats?platform=INSTAGRAM,TIKTOK,YOUTUBE
    ↓
For each platform:
    ├─ Get service from factory
    ├─ Fetch account metrics from API
    ├─ Cache results in Redis
    └─ Return aggregated response

Response:
{
  instagram: { followers: 50000, ... },
  tiktok: { followers: 120000, ... },
  youtube: { followers: 75000, ... }
}
```

### Multi-Platform Media List

```
GET /api/v1/creator/media?platform=INSTAGRAM,TIKTOK
    ↓
Query SocialMedia { userId, platform: { $in: ['INSTAGRAM', 'TIKTOK'] } }
    ↓
Return media metadata from DB
    ↓
When user clicks media:
    └─ Fetch insights from appropriate service
```

### Platform Switching

```
User clicks "Switch to TikTok"
    ↓
GET /api/v1/creator/profile?platform=TIKTOK
    ↓
Factory returns TikTok service
    ↓
Fetch TikTok-specific metrics
    ↓
Display to user
```

---

## Caching Strategy (Multi-Platform)

Each platform has different rate limits and refresh intervals:

```typescript
// Redis cache keys
`metrics:${userId}:${platform}`     // TTL: varies by platform
`media:${userId}:${platform}`       // TTL: 2 hours
`insights:${mediaId}:${platform}`   // TTL: 5-10 minutes
```

**Per-Platform TTLs:**
- **Instagram**: 1 hour (slower API)
- **TikTok**: 30 minutes (faster growth)
- **YouTube**: 2 hours (more stable)

---

## Migration Path: Instagram → Multi-Platform

| Phase | What | Status |
|-------|------|--------|
| 1 | InstagramMedia model + service | ✅ Done |
| 2 | Refactor to ISocialMediaService interface | ✅ Done |
| 3 | Create SocialMedia (generic) model | ✅ Done |
| 4 | Create SocialMediaServiceFactory | ✅ Done |
| 5 | Update User model (socialAccounts array) | ✅ Done |
| 6 | Update controllers for factory pattern | ⏳ Next |
| 7 | Implement TikTok service | ⏳ Next |
| 8 | Implement YouTube service | ⏳ Next |
| 9 | Multi-platform dashboards | ⏳ Next |
| 10 | Platform comparison analytics | ⏳ Next |

---

## Database Queries (Multi-Platform)

### Find all users with Instagram account
```typescript
User.find({ 'socialAccounts.platform': 'INSTAGRAM' })
```

### Find all Reels posted by user on Instagram
```typescript
SocialMedia.find({
  userId: userId,
  platform: 'INSTAGRAM',
  mediaType: 'REEL'
}).sort({ postedAt: -1 })
```

### Find all TikTok videos by user
```typescript
SocialMedia.find({
  userId: userId,
  platform: 'TIKTOK',
  mediaType: 'VIDEO'
}).lean()  // Performance optimization
```

### Get metrics history across all platforms
```typescript
SocialStats.find({
  userId: userId,
  snapshotDate: { $gte: startDate, $lte: endDate }
}).sort({ snapshotDate: -1 })
```

---

## Security & Token Management

Each social account stores its own tokens:
- **Access tokens**: Encrypted, short-lived
- **Refresh tokens**: Encrypted, long-lived
- **Token expiry**: Tracked per account

```typescript
// User document
socialAccounts: [
  {
    platform: 'INSTAGRAM',
    accessToken: encrypt(token),      // Encrypted
    refreshToken: encrypt(refresh),    // Encrypted
    tokenExpiry: Date,                 // When to refresh
    permissions: ['user_profile', 'user_media']
  }
]
```

**Token Refresh Flow:**
```
Scheduled job runs every day
    ↓
For each user.socialAccounts:
    ├─ Check if token expires within 7 days
    ├─ Call service.refreshAccessToken()
    ├─ Update encrypted token in DB
    └─ Log for audit
```

---

## Next Steps

1. ⏳ Update all controllers to use factory pattern
2. ⏳ Implement Redis caching with platform-specific TTLs
3. ⏳ Create token refresh scheduler
4. ⏳ Implement TikTok API service
5. ⏳ Implement YouTube API service
6. ⏳ Build multi-platform aggregation endpoints
7. ⏳ Add platform-specific analytics queries
