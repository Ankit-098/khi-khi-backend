/**
 * Abstract Social Media Service Interface
 * Base interface for all platform implementations
 * Ensures consistent API across Instagram, TikTok, YouTube, etc.
 */

export interface IUserMetrics {
    followers: number;
    following: number;
    mediaCount: number;
    name: string;
    biography: string;
}

export interface IMediaInsights {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    impressions: number;
    reach: number;
    engagementRate: number;
}

export interface IMediaData {
    id: string;
    caption: string;
    mediaType: string;
    mediaUrl: string;
    permalink: string;
    timestamp: Date;
    likeCount: number;
    commentCount: number;
}

export interface IAudienceDemographics {
    countries: Array<{ country: string; percentage: number }>;
    ageGroups: Array<{ group: string; percentage: number }>;
    gender?: { male: number; female: number; other: number };
    topCities?: Array<{ city: string; percentage: number }>;
}

export interface ISocialMediaService {
    /**
     * Platform identifier
     */
    platform: string;

    /**
     * Fetch account metrics
     */
    getAccountMetrics(userId: string, accessToken: string): Promise<IUserMetrics>;

    /**
     * Fetch all media for a user (paginated)
     */
    getUserMedia(
        userId: string,
        accessToken: string,
        limit?: number,
        after?: string
    ): Promise<{ media: IMediaData[]; nextCursor?: string }>;

    /**
     * Fetch insights for a specific media
     */
    getMediaInsights(mediaId: string, accessToken: string): Promise<IMediaInsights>;

    /**
     * Fetch audience demographics
     */
    getAudienceDemographics(userId: string, accessToken: string): Promise<IAudienceDemographics>;

    /**
     * Refresh access token
     */
    refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>;

    /**
     * Validate token is still valid
     */
    validateToken(accessToken: string): Promise<boolean>;

    /**
     * Get platform-specific rate limits
     */
    getRateLimits(): { requestsPerHour: number; requestsPerDay: number };
}
