/**
 * Instagram API Service
 * Implements ISocialMediaService for Instagram platform
 * Fetches real-time metrics from Instagram Graph API
 */

import axios from 'axios';
import { ISocialMediaService, IUserMetrics, IMediaInsights, IMediaData, IAudienceDemographics } from './ISocialMediaService';

class InstagramAPIService implements ISocialMediaService {
    readonly platform = 'INSTAGRAM';
    private apiBaseUrl = 'https://graph.instagram.com';
    private apiVersion = 'v22.0';

    getRateLimits() {
        return {
            requestsPerHour: 200,
            requestsPerDay: 5000
        };
    }

    /**
     * Fetch account metrics from Instagram
     * Called when user requests profile/dashboard
     * Result cached in Redis for 1 hour
     */
    async getAccountMetrics(userId: string, accessToken: string): Promise<IUserMetrics> {
        try {
            const endpoint = `${this.apiBaseUrl}/${this.apiVersion}/me?fields=followers_count,follows_count,media_count,name,biography&access_token=${accessToken}`;

            const response = await axios.get(endpoint);
            return {
                followers: response.data.followers_count,
                following: response.data.follows_count,
                mediaCount: response.data.media_count,
                name: response.data.name,
                biography: response.data.biography,
            };
        } catch (error) {
            console.error('Failed to fetch account metrics:', error);
            throw new Error('Instagram API error: Failed to fetch account metrics');
        }
    }

    /**
     * Fetch all media for a user
     * Called during initial login and periodic sync
     * Paginated to handle large media counts
     */
    async getUserMedia(
        userId: string,
        accessToken: string,
        limit: number = 20,
        after?: string
    ): Promise<{ media: IMediaData[]; nextCursor?: string }> {
        console.log(`[InstagramAPI] Fetching media for user: ${userId}, limit: ${limit}`);
        try {
            const paginationParam = after ? `&after=${after}` : '';
            const endpoint = `${this.apiBaseUrl}/${this.apiVersion}/me/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,video_views&limit=${limit}${paginationParam}&access_token=${accessToken}`;

            const response = await axios.get(endpoint);
            const rawMedia = response.data.data || [];

            // Return basic media data only (Lazy loading insights)
            const media = rawMedia.map((item: any) => ({
                id: item.id,
                caption: item.caption || '',
                mediaType: item.media_type,
                mediaUrl: item.media_url,
                thumbnailUrl: item.thumbnail_url,
                permalink: item.permalink,
                timestamp: new Date(item.timestamp),
                likeCount: item.like_count || 0,
                commentCount: item.comments_count || 0,
                viewCount: item.video_views,
                // These will be fetched lazily on click
                reach: 0,
                impressions: 0,
                saves: 0,
                shares: 0,
                totalInteractions: 0,
                views: 0,
                mediaProductType: item.media_product_type
            }));

            return {
                media,
                nextCursor: response.data.paging?.cursors?.after,
            };
        } catch (error) {
            console.error('Failed to fetch user media:', error);
            throw new Error('Instagram API error: Failed to fetch media');
        }
    }

    /**
     * Get insights for a specific media item (Lazy loaded on click)
     */
    async getMediaInsights(
        userId: string,
        accessToken: string,
        mediaId: string,
        mediaType: string,
        followerCount?: number
    ): Promise<Partial<IMediaData>> {
        console.log(`[InstagramAPI] Fetching insights for media ID: ${mediaId} (${mediaType})`);
        
        let reach = 0;
        let impressions = 0;
        let saves = 0;
        let shares = 0;
        let totalInteractions = 0;
        let views = 0;

        try {
            // Updated Metric Strategy based on Meta v22.0 Documentation
            // Unified 'views' metric is now preferred over 'impressions' and 'video_views'
            let metrics = ['views', 'reach', 'total_interactions', 'saved'];
            
            // Note: 'shares' is common but let's be safe. 
            // 'impressions' is deprecated/unsupported for Reels.
            metrics.push('shares');

            const endpoint = `${this.apiBaseUrl}/${this.apiVersion}/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`;
            const response = await axios.get(endpoint);
            
            const insightsData = response.data.data;
            if (Array.isArray(insightsData)) {
                views = insightsData.find((i: any) => i.name === 'views')?.values[0]?.value || 0;
                reach = insightsData.find((i: any) => i.name === 'reach')?.values[0]?.value || 0;
                saves = insightsData.find((i: any) => i.name === 'saved')?.values[0]?.value || 0;
                shares = insightsData.find((i: any) => i.name === 'shares')?.values[0]?.value || 0;
                totalInteractions = insightsData.find((i: any) => i.name === 'total_interactions')?.values[0]?.value || 0;
                
                // Keep impressions for old posts if available, but it's being phased out
                impressions = insightsData.find((i: any) => i.name === 'impressions')?.values[0]?.value || 0;

                console.log(`[Metrics] ${mediaType} ${mediaId}: Views=${views}, Reach=${reach}, TotalInteractions=${totalInteractions}`);
            }
        } catch (err: any) {
            console.error(`[Metrics Error] ${mediaType} ${mediaId} insights failed:`, err.response?.data || err.message);
            
            // Fallback for older API versions or restricted accounts: retry without 'views' if it fails
            if (err.response?.status === 400) {
                try {
                    console.log(`[InstagramAPI] views metric failed for ${mediaId}, falling back to legacy impressions.`);
                    const legacyMetrics = ['reach', 'total_interactions', 'shares', 'saved', 'impressions'];
                    const legacyEndpoint = `${this.apiBaseUrl}/${this.apiVersion}/${mediaId}/insights?metric=${legacyMetrics.join(',')}&access_token=${accessToken}`;
                    const legacyResponse = await axios.get(legacyEndpoint);
                    
                    const legacyData = legacyResponse.data.data;
                    reach = legacyData.find((i: any) => i.name === 'reach')?.values[0]?.value || 0;
                    impressions = legacyData.find((i: any) => i.name === 'impressions')?.values[0]?.value || 0;
                    saves = legacyData.find((i: any) => i.name === 'saved')?.values[0]?.value || 0;
                    shares = legacyData.find((i: any) => i.name === 'shares')?.values[0]?.value || 0;
                    totalInteractions = legacyData.find((i: any) => i.name === 'total_interactions')?.values[0]?.value || 0;
                } catch (retryErr) {
                    console.error(`[Metrics Error] Triple fallback failed for ${mediaId}`);
                }
            }
        }

        // --- CALCULATIONS (Moved from Frontend) ---
        const interactions = totalInteractions || 0;
        
        // 1. Standard ER (By Reach)
        let engagementRateStandard = '0.00';
        if (reach > 0) {
            const res = (interactions / reach) * 100;
            engagementRateStandard = res > 1000 ? '999+' : res.toFixed(2);
        } else if (followerCount && followerCount > 0) {
            const res = (interactions / followerCount) * 100;
            engagementRateStandard = res > 1000 ? '999+' : res.toFixed(2);
        }

        // 2. Efficiency ER (By Views)
        let engagementRateEfficiency = '0.00';
        if (views > 0) {
            const res = (interactions / views) * 100;
            engagementRateEfficiency = res > 1000 ? '999+' : res.toFixed(2);
        }

        return {
            reach,
            impressions,
            saves,
            shares,
            totalInteractions,
            views,
            engagementRateStandard,
            engagementRateEfficiency
        };
    }

    /**
     * Fetch audience/demographics data
     * Called for brand campaign profiling
     * Result cached in Redis for 24 hours (changes slowly)
     */
    async getAudienceDemographics(
        userId: string,
        accessToken: string
    ): Promise<IAudienceDemographics> {
        try {
            const endpoint = `${this.apiBaseUrl}/${this.apiVersion}/${userId}/insights?metric=audience_city,audience_country,audience_age_gender&period=lifetime&access_token=${accessToken}`;

            const response = await axios.get(endpoint);

            const demographics = {
                countries: [],
                ageGroups: [],
            };

            // Parse and format demographic data
            for (const item of response.data.data) {
                if (item.name === 'audience_country') {
                    demographics.countries = item.values[0]?.value || [];
                }
                if (item.name === 'audience_age_gender') {
                    demographics.ageGroups = item.values[0]?.value || [];
                }
            }

            return demographics;
        } catch (error) {
            console.error('Failed to fetch audience demographics:', error);
            throw new Error('Instagram API error: Failed to fetch demographics');
        }
    }

    /**
     * Refresh access token using refresh token
     * Called automatically when token expires
     */
    async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
        try {
            const endpoint = `${this.apiBaseUrl}/${this.apiVersion}/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`;

            const response = await axios.get(endpoint);

            return {
                accessToken: response.data.access_token,
                expiresIn: response.data.expires_in,
            };
        } catch (error) {
            console.error('Failed to refresh token:', error);
            throw new Error('Instagram API error: Failed to refresh token');
        }
    }

    /**
     * Validate if access token is still valid
     */
    async validateToken(accessToken: string): Promise<boolean> {
        try {
            const endpoint = `${this.apiBaseUrl}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
            const response = await axios.get(endpoint);
            return response.data.data.is_valid ?? false;
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    }
}

export default new InstagramAPIService();
