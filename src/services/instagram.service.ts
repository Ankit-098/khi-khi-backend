/**
 * Instagram API Service
 * Handles all Instagram Graph API calls securely with encrypted token storage
 */

import axios, { AxiosInstance } from 'axios';
import securityService from './security.service';

interface InstagramUserInfo {
    user_id: string;
    username: string;
    email?: string;
    name?: string;
    biography?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string;
}

interface InstagramMediaItem {
    id: string;
    caption?: string;
    media_type: string;
    media_url?: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
}

class InstagramService {
    private axiosInstance: AxiosInstance;
    private apiVersion: string;

    constructor() {
        this.apiVersion = process.env.INSTAGRAM_API_VERSION || 'v18.0';

        // Initialize axios instance with base URL
        this.axiosInstance = axios.create({
            baseURL: 'https://graph.instagram.com',
            timeout: 10000
        });
    }

    /**
     * Encrypt token for storage in database
     */
    encryptToken(token: string): string {
        return securityService.encryptToken(token);
    }

    /**
     * Decrypt token from database
     */
    decryptToken(encryptedToken: string): string {
        return securityService.decryptToken(encryptedToken);
    }

    /**
     * GET /me endpoint - Get authenticated user info
     * Official docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
     */
    async getMe(accessToken: string): Promise<InstagramUserInfo> {
        try {
            console.log('\n========== GET /me REQUEST ==========');
            console.log('📝 Requesting: GET /me');
            console.log('📝 Fields: user_id, username');

            const response = await this.axiosInstance.get(`/${this.apiVersion}/me`, {
                params: {
                    fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url',
                    access_token: accessToken
                }
            });

            console.log('✅ GET /me successful');
            console.log('📝 Response:', JSON.stringify(response.data, null, 2));
            console.log('========== GET /me COMPLETE ==========\n');

            // Map 'id' to 'user_id' for consistency with other API calls
            return {
                user_id: response.data.id,
                username: response.data.username,
                email: response.data.email,
                name: response.data.name,
                biography: response.data.biography,
                followers_count: response.data.followers_count,
                follows_count: response.data.follows_count,
                media_count: response.data.media_count,
                profile_picture_url: response.data.profile_picture_url
            };
        } catch (error: any) {
            console.error('❌ Error in getMe:', error.message);
            if (error.response?.data) {
                console.error('📋 Instagram API returned:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * GET /<IG_ID>/media endpoint - Get user's media
     * Official docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
     */
    async getUserMedia(userId: string, accessToken: string, limit: number = 10): Promise<InstagramMediaItem[]> {
        try {
            console.log('\n========== GET /<IG_ID>/media REQUEST ==========');
            console.log('📝 Requesting: GET /' + userId + '/media');
            console.log('📝 Limit:', limit);

            const response = await this.axiosInstance.get(
                `/${this.apiVersion}/${userId}/media`,
                {
                    params: {
                        fields: 'id,caption,media_type,media_url,timestamp,like_count,comments_count',
                        limit: limit,
                        access_token: accessToken
                    }
                }
            );

            console.log('✅ GET /media successful');
            console.log('📝 Returned', response.data.data?.length || 0, 'media items');
            console.log('========== GET /media COMPLETE ==========\n');

            return response.data.data || [];
        } catch (error: any) {
            console.error('❌ Error in getUserMedia:', error.message);
            if (error.response?.data) {
                console.error('📋 Instagram API returned:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * GET /<IG_ID>/insights endpoint - Get user's insights (metrics)
     */
    async getUserInsights(userId: string, accessToken: string, metric: string = 'impressions'): Promise<any> {
        try {
            console.log('\n========== GET /<IG_ID>/insights REQUEST ==========');
            console.log('📝 Requesting: GET /' + userId + '/insights');
            console.log('📝 Metric:', metric);

            const response = await this.axiosInstance.get(
                `/${this.apiVersion}/${userId}/insights`,
                {
                    params: {
                        metric: metric,
                        period: 'day',
                        access_token: accessToken
                    }
                }
            );

            console.log('✅ GET /insights successful');
            console.log('📝 Response:', JSON.stringify(response.data, null, 2));
            console.log('========== GET /insights COMPLETE ==========\n');

            return response.data.data || [];
        } catch (error: any) {
            console.error('❌ Error in getUserInsights:', error.message);
            if (error.response?.data) {
                console.error('📋 Instagram API returned:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Generic GET request to any Instagram API endpoint
     * Use this for endpoints not yet implemented
     */
    async get(endpoint: string, accessToken: string, params?: Record<string, any>): Promise<any> {
        try {
            console.log('\n========== GENERIC GET REQUEST ==========');
            console.log('📝 Endpoint:', endpoint);
            console.log('📝 Params:', params);

            const response = await this.axiosInstance.get(
                `/${this.apiVersion}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`,
                {
                    params: {
                        ...params,
                        access_token: accessToken
                    }
                }
            );

            console.log('✅ GET request successful');
            console.log('📝 Response:', JSON.stringify(response.data, null, 2));
            console.log('========== GENERIC GET COMPLETE ==========\n');

            return response.data;
        } catch (error: any) {
            console.error('❌ Error in generic GET:', error.message);
            if (error.response?.data) {
                console.error('📋 Instagram API returned:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Generic POST request to any Instagram API endpoint
     * Use this for publish endpoints
     */
    async post(endpoint: string, accessToken: string, data?: Record<string, any>): Promise<any> {
        try {
            console.log('\n========== GENERIC POST REQUEST ==========');
            console.log('📝 Endpoint:', endpoint);
            console.log('📝 Data:', data);

            const response = await this.axiosInstance.post(
                `/${this.apiVersion}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`,
                {
                    ...data,
                    access_token: accessToken
                }
            );

            console.log('✅ POST request successful');
            console.log('📝 Response:', JSON.stringify(response.data, null, 2));
            console.log('========== GENERIC POST COMPLETE ==========\n');

            return response.data;
        } catch (error: any) {
            console.error('❌ Error in generic POST:', error.message);
            if (error.response?.data) {
                console.error('📋 Instagram API returned:', error.response.data);
            }
            throw error;
        }
    }
}

// Export singleton instance
export default new InstagramService();
