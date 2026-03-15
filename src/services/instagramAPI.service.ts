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
    private apiVersion = 'v18.0';

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
        try {
            const paginationParam = after ? `&after=${after}` : '';
            const endpoint = `${this.apiBaseUrl}/${this.apiVersion}/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}${paginationParam}&access_token=${accessToken}`;

            const response = await axios.get(endpoint);

            const media = response.data.data.map((item: any) => ({
                id: item.id,
                caption: item.caption || '',
                mediaType: item.media_type,
                mediaUrl: item.media_url,
                permalink: item.permalink,
                timestamp: new Date(item.timestamp),
                likeCount: item.like_count,
                commentCount: item.comments_count,
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
     * Fetch insights for a specific media post
     * Called when displaying post details
     * Result cached in Redis for 5 minutes (changes frequently)
     */
    async getMediaInsights(mediaId: string, accessToken: string): Promise<IMediaInsights> {
        try {
            const metrics = ['like_count', 'comments_count', 'shares_count', 'saved_count', 'impressions', 'reach'];
            const fieldsParam = metrics.join(',');

            const endpoint = `${this.apiBaseUrl}/${this.apiVersion}/${mediaId}/insights?metric_type=ENGAGEMENT&fields=${fieldsParam}&access_token=${accessToken}`;

            const response = await axios.get(endpoint);

            const insightData = response.data.data.reduce(
                (acc: any, item: any) => {
                    acc[item.name] = item.values[0]?.value || 0;
                    return acc;
                },
                {}
            );

            // Calculate engagement rate = (likes + comments) / reach * 100
            const engagementRate =
                insightData.reach > 0
                    ? ((insightData.like_count + insightData.comments_count) / insightData.reach) * 100
                    : 0;

            return {
                likes: insightData.like_count,
                comments: insightData.comments_count,
                shares: insightData.shares_count || 0,
                saves: insightData.saved_count || 0,
                impressions: insightData.impressions,
                reach: insightData.reach,
                engagementRate: parseFloat(engagementRate.toFixed(2)),
            };
        } catch (error) {
            console.error('Failed to fetch media insights:', error);
            throw new Error('Instagram API error: Failed to fetch insights');
        }
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
