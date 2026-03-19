/**
 * Profile Service
 * Handles user profile management including primary account switching
 */

import User, { ISocialAccount, IUser } from '../models/User';
import OTP, { OTPMethod } from '../models/OTP';
import securityService from './security.service';
import mongoose from 'mongoose';

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
    async getPrimaryAccountToken(userId: string): Promise<{ platform: string; platformId: string; accessToken: string } | null> {
        try {
            const primaryAccount = await this.getPrimaryAccount(userId);
            if (!primaryAccount) {
                return null;
            }

            return {
                platform: primaryAccount.platform,
                platformId: primaryAccount.platformId,
                accessToken: securityService.decryptToken(primaryAccount.accessToken),
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

    /**
     * Update user profile details
     */
    async updateProfile(userId: string, data: any): Promise<IUser> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Update basic profile fields
            if (data.name) user.profile.name = data.name;
            if (data.bio !== undefined) user.profile.bio = data.bio;
            if (data.phoneNumber !== undefined) user.profile.phoneNumber = data.phoneNumber;
            if (data.contactEmail !== undefined) user.profile.contactEmail = data.contactEmail;
            if (data.country !== undefined) user.profile.country = data.country;
            if (data.state !== undefined) user.profile.state = data.state;
            if (data.city !== undefined) user.profile.city = data.city;
            if (data.contactPrivacy !== undefined) user.profile.contactPrivacy = data.contactPrivacy;
            if (data.category !== undefined) user.profile.category = data.category;
            if (data.subCategories !== undefined) user.profile.subCategories = data.subCategories;

            await user.save();
            return user;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    /**
     * Update rates for a specific social account
     */
    async updateRates(userId: string, platform: string, platformId: string, rates: any[]): Promise<IUser> {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const account = user.socialAccounts.find(
            (acc: any) => acc.platform === platform && acc.platformId === platformId
        );
        if (!account) throw new Error('Social account not found');

        account.rates = rates;
        console.log(`[ProfileService] Saving ${rates.length} rates to DB for user ${userId} context ${platform}`);
        await user.save();
        return user;
    }

    /**
     * Update verification status for profile or contact
     */
    async setVerificationStatus(
        userId: string, 
        type: 'profile' | 'contact', 
        status: boolean
    ): Promise<IUser> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (type === 'profile') {
                user.verification.profile = status;
            } else {
                user.verification.contact = status;
            }

            await user.save();
            return user;
        } catch (error) {
            console.error(`[ProfileService] Error setting ${type} verification:`, error);
            throw error;
        }
    }

    /**
     * Update account status
     */
    async updateStatus(userId: string, status: any): Promise<IUser> {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.status = status;
            await user.save();
            return user;
        } catch (error) {
            console.error('[ProfileService] Error updating status:', error);
            throw error;
        }
    }

    /**
     * Get insights for a specific media item (No userId required, uses primary token)
     */
    async getMediaInsights(userId: string, mediaId: string, mediaType: string) {
        try {
            const primaryToken = await this.getPrimaryAccountToken(userId);
            if (!primaryToken) {
                throw new Error('No primary account configured');
            }

            const fromFactory = require('./socialMediaFactory').default;
            const service = fromFactory.getService(primaryToken.platform);

            // Fetch primary account again to get followerCount for ER fallback
            const primaryAccount = await this.getPrimaryAccount(userId);

            return await service.getMediaInsights(
                userId,
                primaryToken.accessToken,
                mediaId,
                mediaType,
                primaryAccount?.followerCount || 0
            );
        } catch (error) {
            console.error('Error fetching media insights:', error);
            throw error;
        }
    }
    /**
     * Send Verification OTP
     * Generates a 6-digit OTP and "sends" it via the specified method
     */
    async sendVerificationOTP(userId: string, method: string, contactValue: string): Promise<any> {
        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to database
        const otpEntry = new OTP({
            userId: new mongoose.Types.ObjectId(userId),
            method: method as OTPMethod,
            otp: otpCode,
            contactValue,
            expiresAt
        });

        await otpEntry.save();

        // Simulate sending
        console.log(`\n[OTP] SENDING ${method} OTP TO ${contactValue}`);
        console.log(`[OTP] CODE: ${otpCode}\n`);

        // In a real app, integrate with SendGrid/Twilio here
        
        return {
            success: true,
            message: `OTP sent successfully via ${method}`,
            expiresAt
        };
    }

    /**
     * Verify Contact OTP
     * Validates the OTP and updates user's verification status
     */
    async verifyContactOTP(userId: string, method: string, otpCode: string): Promise<any> {
        // Find latest valid OTP
        const otpEntry = await OTP.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            method: method as OTPMethod,
            otp: otpCode,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!otpEntry) {
            throw new Error('Invalid or expired OTP');
        }

        // Mark OTP as used
        otpEntry.isUsed = true;
        await otpEntry.save();

        // Update user verification status
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        if (method === 'EMAIL') {
            user.verification.emailVerified = true;
            // Also update main contact email if it matches
            if (user.profile.contactEmail === otpEntry.contactValue) {
                // Keep consistent
            }
        } else if (method === 'SMS' || method === 'WHATSAPP') {
            user.verification.phoneVerified = true;
        }

        // Broad "contact" verified if either is verified (optional logic)
        if (user.verification.emailVerified || user.verification.phoneVerified) {
            user.verification.contact = true;
        }

        await user.save();

        return {
            success: true,
            verification: user.verification,
            message: 'Contact verified successfully'
        };
    }
    /**
     * Update account aggregated metrics (Avg Reach, Engagement Rate)
     * Fetches recent media and stores calculated averages in the User model
     */
    async updateAccountAggregates(userId: string, platform: string, platformId: string): Promise<void> {
        try {
            console.log(`[ProfileService] Updating aggregates for ${userId} (${platform})`);
            
            const primaryToken = await this.getPrimaryAccountToken(userId);
            if (!primaryToken) return;

            const fromFactory = require('./socialMediaFactory').default;
            const service = fromFactory.getService(platform);

            // Fetch recent 12 media items to calculate averages
            // Fetch recent 12 media items
            const { media } = await service.getUserMedia(userId, primaryToken.accessToken, 12);
            
            if (!media || media.length === 0) {
                console.log('[ProfileService] No media found for aggregate update');
                return;
            }

            const user = await User.findById(userId);
            if (!user) return;

            const account = user.socialAccounts.find(
                (acc: any) => acc.platform === platform && acc.platformId === platformId
            );
            if (!account) return;

            const followerCount = account.followerCount || 0;

            // Fetch deep insights for the first 6 items to get real interactions (likes+comments+shares+saves) and Reach
            // We do this because basic getUserMedia often has 0 likes/comments for certain types of accounts
            const insightProms = media.slice(0, 6).map((m: any) => 
                service.getMediaInsights(userId, primaryToken.accessToken, m.id, m.mediaType, followerCount)
                    .catch(() => ({ totalInteractions: 0, reach: 0, views: 0 }))
            );
            const insights = await Promise.all(insightProms);

            // Calculate Metrics based on Insights (Most accurate)
            let totalInteractions = 0;
            let totalReach = 0;
            let countWithData = 0;

            insights.forEach((ins: any) => {
                const interactions = ins.totalInteractions || 0;
                const reach = ins.reach || ins.views || 0;
                
                if (interactions > 0 || reach > 0) {
                    totalInteractions += interactions;
                    totalReach += reach;
                    countWithData++;
                }
            });

            // Fallback to basic counts if no insights or data
            if (countWithData === 0) {
                totalInteractions = media.reduce((sum: number, m: any) => sum + (m.likeCount || 0) + (m.commentCount || 0), 0);
                totalReach = media.reduce((sum: number, m: any) => sum + (m.viewCount || m.reach || 0), 0);
                countWithData = media.length;
            }

            const avgInteractions = totalInteractions / countWithData;
            const avgReachVal = totalReach / countWithData;

            // Calculate Engagement Rate (Standard for this app: Interactions / Reach)
            const divisor = avgReachVal > 0 ? avgReachVal : (followerCount > 0 ? followerCount : 1);
            const er = (avgInteractions / divisor) * 100;
            
            console.log(`[ProfileService] totalInteractions: ${totalInteractions}, avgReach: ${avgReachVal}, ER: ${er}`);

            // Formatter
            const formatReach = (val: number) => {
                if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
                return Math.floor(val).toString();
            };

            // Update Account
            account.engagementRate = (er > 1000 ? '999' : er.toFixed(1)) + '%';
            account.avgReach = formatReach(avgReachVal);
            user.markModified('socialAccounts');
            await user.save();
        } catch (error) {
            console.error('[ProfileService] Error updating aggregates:', error);
        }
    }
}

export default new ProfileService();
