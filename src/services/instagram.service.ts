/**
 * Instagram API Service
 * Handles all Instagram Graph API calls securely with encrypted token storage
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

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
    private encryptionKey: string;

    constructor() {
        this.apiVersion = process.env.INSTAGRAM_API_VERSION || 'v18.0';
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-min-32-chars';

        // Validate encryption key length (minimum 32 chars for AES-256)
        if (this.encryptionKey.length < 32) {
            console.warn('⚠️  ENCRYPTION_KEY should be at least 32 characters for AES-256');
        }

        // Initialize axios instance with base URL
        this.axiosInstance = axios.create({
            baseURL: 'https://graph.instagram.com',
            timeout: 10000
        });
    }

    /**
     * Encrypt sensitive data (like tokens) using AES-256
     */
    private encrypt(data: string): string {
        try {
            // Use first 32 chars of encryption key for AES-256
            const key = Buffer.from(this.encryptionKey.substring(0, 32).padEnd(32, '0'));
            const iv = crypto.randomBytes(16);
            
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Return IV + encrypted data
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('❌ Encryption error:', error);
            throw new Error('Failed to encrypt sensitive data');
        }
    }

    /**
     * Decrypt sensitive data (like tokens) using AES-256
     */
    private decrypt(encrypted: string): string {
        try {
            const [iv, data] = encrypted.split(':');
            const key = Buffer.from(this.encryptionKey.substring(0, 32).padEnd(32, '0'));
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
            let decrypted = decipher.update(data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption error:', error);
            throw new Error('Failed to decrypt sensitive data');
        }
    }

    /**
     * Encrypt token for storage in database
     */
    encryptToken(token: string): string {
        console.log('🔐 Encrypting token for storage...');
        return this.encrypt(token);
    }

    /**
     * Decrypt token from database
     */
    decryptToken(encryptedToken: string): string {
        console.log('🔐 Decrypting token from storage...');
        return this.decrypt(encryptedToken);
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
