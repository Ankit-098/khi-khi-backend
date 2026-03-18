/**
 * Instagram Token Helper
 * Utility functions for managing encrypted access tokens and making API calls
 */

import User from '../models/User';
import instagramService from './instagram.service';

/**
 * Get and decrypt Instagram access token for a user's account
 * @param userId - MongoDB user ID
 * @param platformId - Instagram user ID (account ID)
 * @returns Decrypted access token
 */
export async function getInstagramAccessToken(userId: string, platformId: string): Promise<string> {
    try {
        console.log('🔐 Getting Instagram access token for user:', userId);
        
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        // Find the Instagram account
        const account = user.socialAccounts.find(
            acc => acc.platform === 'INSTAGRAM' && acc.platformId === platformId
        );

        if (!account) {
            throw new Error(`Instagram account ${platformId} not found for user ${userId}`);
        }

        // Check if token is expired
        if (account.tokenExpiry && new Date() > account.tokenExpiry) {
            console.warn('⚠️  Token expired at:', account.tokenExpiry);
            throw new Error('Access token has expired. Please reauthenticate.');
        }

        // Decrypt and return the token
        const token = instagramService.decryptToken(account.accessToken);
        console.log('✅ Token decrypted successfully');
        
        return token;
    } catch (error) {
        console.error('❌ Error getting Instagram access token:', error);
        throw error;
    }
}

/**
 * Make an Instagram API call with automatic token decryption
 * Example: const userInfo = await callInstagramAPI(userId, platformId, 'getMe');
 * @param userId - MongoDB user ID
 * @param platformId - Instagram user ID (account ID)
 * @param method - Method name from InstagramService (e.g., 'getMe', 'getUserMedia', 'getUserInsights')
 * @param params - Additional parameters to pass to the method
 * @returns API response
 */
export async function callInstagramAPI(
    userId: string,
    platformId: string,
    method: 'getMe' | 'getUserMedia' | 'getUserInsights' | 'get' | 'post',
    params?: any
): Promise<any> {
    try {
        console.log(`📱 Calling Instagram API method: ${method}`);
        
        // Get and decrypt the token
        const accessToken = await getInstagramAccessToken(userId, platformId);

        // Call the appropriate method
        switch (method) {
            case 'getMe':
                return await instagramService.getMe(accessToken);
            
            case 'getUserMedia':
                return await instagramService.getUserMedia(
                    platformId,
                    accessToken,
                    params?.limit || 10
                );
            
            case 'getUserInsights':
                return await instagramService.getUserInsights(
                    platformId,
                    accessToken,
                    params?.metric || 'impressions'
                );
            
            case 'get':
                return await instagramService.get(
                    params?.endpoint,
                    accessToken,
                    params?.queryParams
                );
            
            case 'post':
                return await instagramService.post(
                    params?.endpoint,
                    accessToken,
                    params?.data
                );
            
            default:
                throw new Error(`Unknown Instagram API method: ${method}`);
        }
    } catch (error) {
        console.error(`❌ Error calling Instagram API (${method}):`, error);
        throw error;
    }
}

/**
 * Check if a user's Instagram token is expiring soon (within 7 days)
 * Use this to trigger token refresh if needed
 * @param userId - MongoDB user ID
 * @param platformId - Instagram user ID (account ID)
 * @returns true if token expires within 7 days, false otherwise
 */
export async function isInstagramTokenExpiringSoon(userId: string, platformId: string): Promise<boolean> {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        const account = user.socialAccounts.find(
            acc => acc.platform === 'INSTAGRAM' && acc.platformId === platformId
        );

        if (!account || !account.tokenExpiry) {
            return false;
        }

        // Calculate days until expiry
        const now = new Date();
        const daysUntilExpiry = (account.tokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        console.log(`📅 Days until token expiry: ${Math.round(daysUntilExpiry)}`);
        
        return daysUntilExpiry <= 7;
    } catch (error) {
        console.error('❌ Error checking token expiry:', error);
        return false;
    }
}

export default {
    getInstagramAccessToken,
    callInstagramAPI,
    isInstagramTokenExpiringSoon
};
