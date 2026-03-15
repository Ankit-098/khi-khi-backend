/**
 * Profile Service
 * Handles user profile management including primary account switching
 */

import User, { ISocialAccount } from '../models/User';

interface IPrimaryAccountResponse {
    platform: string;
    platformId: string;
    username: string;
    displayName?: string;
    profilePictureUrl?: string;
    followerCount: number;
}

class ProfileService {
    /**
     * Get user's primary social account
     */
    async getPrimaryAccount(userId: string): Promise<ISocialAccount | null> {
        try {
            const user = await User.findById(userId).lean();
            if (!user || !user.socialAccounts) {
                return null;
            }

            const primaryAccount = user.socialAccounts.find((acc) => acc.isPrimary);
            return primaryAccount || null;
        } catch (error) {
            console.error('Error fetching primary account:', error);
            throw error;
        }
    }

    /**
     * Get all social accounts for a user
     */
    async getAllAccounts(userId: string): Promise<IPrimaryAccountResponse[]> {
        try {
            const user = await User.findById(userId).lean();
            if (!user || !user.socialAccounts) {
                return [];
            }

            return user.socialAccounts.map((acc) => ({
                platform: acc.platform,
                platformId: acc.platformId,
                username: acc.username,
                displayName: acc.displayName,
                profilePictureUrl: acc.profilePictureUrl,
                followerCount: acc.followerCount,
            }));
        } catch (error) {
            console.error('Error fetching all accounts:', error);
            throw error;
        }
    }

    /**
     * Switch primary account
     * Only one account can be primary at a time
     */
    async switchPrimaryAccount(
        userId: string,
        targetPlatform: string,
        targetPlatformId: string
    ): Promise<ISocialAccount> {
        try {
            const user = await User.findById(userId);
            if (!user || !user.socialAccounts) {
                throw new Error('User not found');
            }

            // Find target account
            const targetAccount = user.socialAccounts.find(
                (acc) => acc.platform === targetPlatform && acc.platformId === targetPlatformId
            );

            if (!targetAccount) {
                throw new Error(
                    `Social account not found: ${targetPlatform}/${targetPlatformId}`
                );
            }

            // Unset all isPrimary flags
            user.socialAccounts.forEach((acc) => {
                acc.isPrimary = false;
            });

            // Set new primary
            targetAccount.isPrimary = true;

            // Save user
            await user.save();

            return targetAccount;
        } catch (error) {
            console.error('Error switching primary account:', error);
            throw error;
        }
    }

    /**
     * Set first account as primary when user logs in with a new social media
     */
    async setAsPrimaryIfFirstAccount(userId: string, platform: string, platformId: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const targetAccount = user.socialAccounts?.find(
                (acc) => acc.platform === platform && acc.platformId === platformId
            );

            if (!targetAccount) {
                return;
            }

            // If no primary account exists, make this one primary
            const hasPrimary = user.socialAccounts?.some((acc) => acc.isPrimary);
            if (!hasPrimary) {
                targetAccount.isPrimary = true;
                await user.save();
            }
        } catch (error) {
            console.error('Error setting primary account:', error);
            throw error;
        }
    }

    /**
     * Get access token of primary account
     * Used by API calls to fetch fresh data
     */
    async getPrimaryAccountToken(userId: string): Promise<{ platform: string; accessToken: string } | null> {
        try {
            const primaryAccount = await this.getPrimaryAccount(userId);
            if (!primaryAccount) {
                return null;
            }

            return {
                platform: primaryAccount.platform,
                accessToken: primaryAccount.accessToken,
            };
        } catch (error) {
            console.error('Error getting primary account token:', error);
            throw error;
        }
    }

    /**
     * Get platform ID of primary account
     */
    async getPrimaryAccountId(userId: string): Promise<string | null> {
        try {
            const primaryAccount = await this.getPrimaryAccount(userId);
            return primaryAccount?.platformId || null;
        } catch (error) {
            console.error('Error getting primary account ID:', error);
            throw error;
        }
    }
}

export default new ProfileService();
