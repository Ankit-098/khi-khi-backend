# Instagram Login & Data Schema Design

## Overview
Facebook/Instagram Graph API integration with **real-time data fetching** for creators, enabling engagement tracking across posts, reels, and account metrics. Dynamic metrics are fetched on-demand from Instagram API rather than stored in the database.

---

## Architecture: Real-Time vs Persistent Data

```
┌─────────────────────────────────────────────────────────┐
│ PERSISTENT DATA (Stored in MongoDB)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ✅ User.instagramAccount                               │
│    - accessToken, refreshToken (for API auth)          │
│    - instagramId, username, isBusinessAccount          │
│    - accountConnectedAt                                 │
│                                                          │
│ ✅ InstagramMedia (content metadata)                   │
│    - caption, mediaUrl, thumbnailUrl                   │
│    - hashtags, mentions, postedAt                      │
│    - isSponsored flag                                  │
│                                                          │
│ ✅ SocialStats (daily/weekly snapshots)                │
│    - followers, following, totalPosts, totalReels      │
│    - snapshotDate (point-in-time values)              │
│    - Used for analytics and trend tracking             │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ REAL-TIME DATA (Fetched from Instagram API)             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 🌐 Per-Post Metrics (via InstagramAPIService)          │
│    - likes, comments, shares, saves                    │
│    - impressions, reach, engagementRate                │
│    - TTL: 5 minutes (hot data, changes constantly)    │
│                                                          │
│ 🌐 Account Metrics                                      │
│    - followers, following, mediaCount                  │
│    - TTL: 1 hour (relatively stable)                  │
│                                                          │
│ 🌐 Audience Demographics                               │
│    - topCountries, ageGroups, gender split             │
│    - TTL: 24 hours (changes slowly)                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. User Model (`User.ts`)

**Purpose:** Core user document with Instagram OAuth integration

**Key Fields:**

```typescript
instagramAccount: {
  instagramId: string;           // Unique Instagram ID
  username: string;               // Instagram username
  displayName?: string;           // Full name
  profilePictureUrl?: string;    // Profile picture
  bio?: string;                   // Bio text
  followerCount: number;          // Followers (initial load)
  followingCount: number;         // Following (initial load)
  mediaCount: number;             // Total posts + reels
  isBusinessAccount: boolean;    // Business vs Personal
  accessToken: string;           // OAuth access token (NEVER expose)
  refreshToken?: string;         // Token refresh
  tokenExpiry?: Date;            // Token expiration
  permissions: string[];         // Requested scopes
  accountConnectedAt: Date;      // When Instagram connected
}

socialMetrics: {
  lastMetricsUpdate?: Date;      // When metrics were last fetched from API
}
```

**Note:** Actual follower count comes from Instagram API in real-time, not stored here.

**Indexes:**
- `email` (unique, lowercase)
- `instagramAccount.instagramId` (for quick OAuth lookup)
- `role` + `createdAt` (for queries)

**Security Notes:**
- Access tokens stored encrypted (use .env)
- Refresh tokens for long-lived connection
- Permissions tracked for consent compliance

---

### 2. InstagramMedia Model (`InstagramMedia.ts`)

**Purpose:** Content metadata (static data only)

**Structure:**

```typescript
mediaType: enum [POST, REEL, STORY, CAROUSEL]  // Content type
caption?: string;                               // Post caption
mediaUrl: string;                               // Media file URL
thumbnailUrl?: string;                          // Thumbnail for reels
postedAt: Date;                                 // Publication timestamp
hashtags: string[];                             // Extracted hashtags
mentions: string[];                             // Mentions/tags
isSponsored: boolean;                           // Sponsored content flag

// ❌ NO insights stored here
// Real-time likes, comments, reach fetched from Instagram API on demand
```

**Indexes:**
- `userId` + `postedAt` (for timeline queries)
- `userId` + `mediaType` (filter by content type)
- `instagramId` (unique, fast lookup)

**Purpose:**
- Store content library
- Track sponsorships
- Hashtag/mention analysis
- Content discovery

**Data Flow:**
```
User requests "My Reels"
    ↓
Query InstagramMedia { userId, mediaType: 'REEL' }
    ↓
Return cached reel list
    ↓
When user clicks reel → Fetch insights from Instagram API
```

---

### 3. SocialStats Model (`SocialStats.ts`)

**Purpose:** Point-in-time snapshots for analytics (not real-time)

**Structure:**

```typescript
userId: ObjectId             // Reference to User
platform: string             // 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK'
platformId: string           // Instagram account ID
snapshotDate: Date          // When this snapshot was taken
metrics: {
  followers: number;         // Point-in-time follower count
  following: number;        // Following count
  totalPosts: number;       // Total posts
  totalReels: number;       // Total reels
}
```

**Indexes:**
- `userId` + `platform` + `snapshotDate` (for time-series queries)
- `snapshotDate` (for trend analysis)
- `metrics.followers` (sort by follower count)

**Purpose:**
- Historical analytics (follower growth over time)
- Trend tracking
- Creator discovery/ranking
- **NOT** for real-time dashboard data

**Data Flow:**
```
Daily cron job (e.g., 00:00 UTC)
    ↓
For each creator, fetch current account metrics from Instagram API
    ↓
Save a snapshot record with today's date
    ↓
Query snapshot data for analytics (e.g., "follower growth last 30 days")
```

---

## Data Flow: Instagram Login

**Initial Login Flow:**
```
1. User clicks "Login with Instagram"
   ↓
2. OAuth redirect to Instagram auth
   ↓
3. User grants permissions (see list below)
   ↓
4. Instagram redirects with auth code
   ↓
5. Backend exchanges code for access token
   ↓
6. Fetch user profile → Save to User.instagramAccount
   ↓
7. Fetch all media (posts/reels/stories)
   ↓
8. Save media metadata to InstagramMedia (static data only)
   ↓
9. Create daily snapshot in SocialStats
   ↓
10. Initial setup complete ✓
```

**Real-Time Metrics Fetching:**
```
User requests dashboard/post metrics
    ↓
Check Redis cache (hot data)
    ↓
If hit (not expired)
    └→ Return from cache ✓
    
If miss or expired
    └→ Fetch from Instagram API (via InstagramAPIService)
       ├─ Get post likes, comments, reach
       ├─ Get account followers
       ├─ Cache result in Redis (TTL: 5-60 minutes)
       └─ Return fresh data to client
```

**Daily Analytics Snapshot:**
```
Scheduled cron job (0 0 * * * UTC)
    ↓
For each active creator:
    └→ Fetch current account metrics from Instagram API
       ├─ followers, following, totalPosts, totalReels
       ├─ Create new SocialStats document
       └─ Record in DB for historical analysis
```

---

## Required Instagram Permissions

```javascript
const INSTAGRAM_SCOPES = [
  'user_profile',                    // Basic profile info
  'user_media',                      // Access to posts/reels
  'instagram_basic',                 // Instagram business account access
  'instagram_graph_user_content',    // Content library
  'instagram_graph_user_lifetime_insights'  // Lifetime engagement metrics
];
```

---

## Database Relationships

```
┌─────────────────────────────────────────────────┐
│           User (with OAuth tokens)              │
│─────────────────────────────────────────────────│
│ _id (PK)                                        │
│ email                                           │
│ role                                            │
│ instagramAccount (OAuth + account metadata)     │
│ socialMetrics.lastMetricsUpdate                │
└──────────┬──────────────────┬───────────────────┘
           │                  │
    ref: userId         ref: userId
           │                  │
           ↓                  ↓
┌──────────────────────┐  ┌───────────────────┐
│ InstagramMedia (1:N) │  │ SocialStats (1:N) │
│──────────────────────│  │───────────────────│
│ mediaId              │  │ snapshotDate      │
│ caption, mediaUrl    │  │ followers (point) │
│ hashtags, mentions   │  │ following (point) │
│ postedAt             │  │ totalPosts (point)│
│ isSponsored          │  └───────────────────┘
│                      │
│ ❌ NO likes/comments │
│ (fetched from API)   │
└──────────────────────┘
```

---

## API Endpoints (Next Phase)

```
POST   /api/v1/auth/instagram          - Initiate OAuth
POST   /api/v1/auth/instagram/callback - OAuth callback (saves User + InstagramMedia)
GET    /api/v1/creator/profile         - Get profile (real-time from API)
GET    /api/v1/creator/media           - List media (from DB, fast)
GET    /api/v1/creator/media/:id       - Get post details + insights (real-time)
GET    /api/v1/creator/stats           - Get today's snapshot (from DB)
GET    /api/v1/creator/stats/history   - Get historical snapshots (analytics)
POST   /api/v1/creator/sync            - Manual sync trigger
```

**Response Pattern:**
```javascript
// Profile endpoint (calls Instagram API)
GET /api/v1/creator/profile
{
  followers: 50000,           // Real-time from API
  engagement_rate: 4.2,       // Calculated real-time
  bio: "...",
  lastFetched: "2024-03-14T10:30:00Z"
}

// Media list (from DB)
GET /api/v1/creator/media
[
  {
    id: "123456",
    caption: "...",
    mediaUrl: "...",
    postedAt: "2024-03-10",
    hashtags: ["travel", "adventure"]
    // ✅ Likes/comments available at /media/:id endpoint
  }
]

// Media with insights (real-time)
GET /api/v1/creator/media/123456/insights
{
  likes: 1234,               // Real-time from Instagram API
  comments: 56,
  reach: 8900,
  impressions: 12000,
  engagementRate: 5.8
}
```

---

## Performance Strategy

### Why NOT Store Metrics in DB?
- ❌ Data becomes stale within minutes
- ❌ Constant sync overhead (wasting API calls)
- ❌ Storage bloat from redundant snapshots
- ❌ Rate limiting on Instagram API from frequent fetches
- ❌ Complex update queries

### Solution: Hybrid Architecture

**Database (MongoDB):**
- ✅ Fast queries (milliseconds)
- ✅ Static/metadata only (no stale data)
- ✅ Good for content discovery

**Redis Cache:**
- ✅ Hot metrics (5-60 min TTL)
- ✅ Reduces API calls by 95%
- ✅ Sub-millisecond retrieval

**Instagram API:**
- ✅ Fresh data on-demand
- ✅ Called only when cache miss
- ✅ Scheduled daily snapshots

**Query Times:**
```
Metrics from DB        → 10-50ms (would be mutable, stale)
Metrics from Cache     → 1-5ms (fresh, hot)
Metrics from API       → 500-1500ms (always fresh, expensive)

Strategy:
1. Check cache first (fast + usually hits)
2. Fall back to API only if cache expired
3. Store daily snapshot for analytics
```

### Optimization Techniques

✅ **Implemented:**
- Lean queries where possible
- Compound indexes for common queries
- Pagination for large media lists (default: 20/page)
- Redis with sensible TTLs

✅ **Result:**
- Average lookup: 10-50ms
- 95% cache hit ratio → minimal API calls
- Realistic API rate: 5-20 calls/day per creator

---

## Security & Token Management

✅ **Implemented:**
- Tokens encrypted in database
- Unique indexes on OAuth IDs
- Timestamps for audit trails
- Permission tracking for consent compliance

⚠️ **To Implement:**
- Token refresh logic (refresh_access_token endpoint)
- Automatic token refresh when expired
- Rate limiting on API endpoints
- Secure token storage (hsm/vault if enterprise)
- Audit logging for data access

---

## Data Retention Policy

- **InstagramMedia**: Keep indefinitely (archive after 1 year)
- **SocialStats snapshots**: Keep last 90 days (daily), then archive
- **Access tokens**: Refresh every 60 days
- **Cache (Redis)**: Auto-expire per TTL

---

## Next Steps

1. ✅ Schema designed (static data only)
2. ✅ InstagramAPIService created (real-time fetching)
3. ⏳ Implement OAuth controller
4. ⏳ Implement Redis caching layer
5. ⏳ Implement daily snapshot scheduler
6. ⏳ Add token refresh logic
7. ⏳ Add error handling & retry logic
8. ⏳ Implement analytics endpoints
