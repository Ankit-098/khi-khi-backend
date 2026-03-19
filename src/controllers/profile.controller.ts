/**
 * Profile Controller
 * Handles user profile-related requests including account switching
 */

import { Request, Response } from 'express';
import profileService from '../services/profile.service';
import socialMediaFactory from '../services/socialMediaFactory';

class ProfileController {
    /**
     * GET /api/v1/creator/accounts
     * Get all connected social media accounts
     */
    async getAllAccounts(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not authenticated' });
                return;
            }

            const accounts = await profileService.getAllAccounts(userId);

            res.json({
                success: true,
                data: accounts,
                message: 'Accounts fetched successfully',
            });
        } catch (error) {
            console.error('Error in getAllAccounts:', error);
            res.status(500).json({
                success: false,
                error: 'GET_ACCOUNTS_FAILED',
                message: 'Failed to fetch accounts',
            });
        }
    }

    /**
     * GET /api/v1/creator/primary-account
     * Get current primary account details
     */
    async getPrimaryAccount(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not authenticated' });
                return;
            }

            const primaryAccount = await profileService.getPrimaryAccount(userId);

            if (!primaryAccount) {
                res.status(404).json({
                    success: false,
                    error: 'NO_PRIMARY_ACCOUNT',
                    message: 'No primary account set',
                });
                return;
            }

            // Fetch user for status and verification
            const user = await profileService.updateProfile(userId, {});

            res.json({
                success: true,
                data: {
                    platform: primaryAccount.platform,
                    platformId: primaryAccount.platformId,
                    username: primaryAccount.username,
                    displayName: primaryAccount.displayName,
                    profilePictureUrl: primaryAccount.profilePictureUrl,
                    followerCount: primaryAccount.followerCount,
                    avgReach: primaryAccount.avgReach || '0',
                    engagementRate: primaryAccount.engagementRate || '0.0%',
                    accountConnectedAt: primaryAccount.accountConnectedAt,
                    status: (user as any).status,
                    verification: (user as any).verification,
                    category: (user as any).profile.category,
                    subCategories: (user as any).profile.subCategories,
                },
                message: 'Primary account fetched successfully',
            });
        } catch (error) {
            console.error('Error in getPrimaryAccount:', error);
            res.status(500).json({
                success: false,
                error: 'GET_PRIMARY_ACCOUNT_FAILED',
                message: 'Failed to fetch primary account',
            });
        }
    }

    /**
     * POST /api/v1/creator/switch-account
     * Switch primary social media account
     *
     * Request body:
     * {
     *   platform: 'INSTAGRAM',
     *   platformId: '12345'
     * }
     */
    async switchPrimaryAccount(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not authenticated' });
                return;
            }

            const { platform, platformId } = req.body;

            if (!platform || !platformId) {
                res.status(400).json({
                    success: false,
                    error: 'INVALID_REQUEST',
                    message: 'platform and platformId are required',
                });
                return;
            }

            // Validate platform is supported
            if (!socialMediaFactory.isSupported(platform)) {
                res.status(400).json({
                    success: false,
                    error: 'UNSUPPORTED_PLATFORM',
                    message: `Platform ${platform} is not supported`,
                });
                return;
            }

            const switchedAccount = await profileService.switchPrimaryAccount(userId, platform, platformId);

            res.json({
                success: true,
                data: {
                    platform: switchedAccount.platform,
                    platformId: switchedAccount.platformId,
                    username: switchedAccount.username,
                    displayName: switchedAccount.displayName,
                    profilePictureUrl: switchedAccount.profilePictureUrl,
                    followerCount: switchedAccount.followerCount,
                    isPrimary: switchedAccount.isPrimary,
                },
                message: `Switched to ${platform} account successfully`,
            });
        } catch (error: any) {
            console.error('Error in switchPrimaryAccount:', error);
            res.status(500).json({
                success: false,
                error: 'SWITCH_ACCOUNT_FAILED',
                message: error.message || 'Failed to switch account',
            });
        }
    }

    /**
     * GET /api/v1/creator/profile
     * Get primary account profile with real-time metrics
     */
    async getPrimaryProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not authenticated' });
                return;
            }

            const primaryToken = await profileService.getPrimaryAccountToken(userId);
            if (!primaryToken) {
                res.status(404).json({
                    success: false,
                    error: 'NO_PRIMARY_ACCOUNT',
                    message: 'No primary account configured',
                });
                return;
            }

            // Get platform-specific service
            const service = socialMediaFactory.getService(primaryToken.platform);

            // Fetch real-time metrics from API
            const metrics = await service.getAccountMetrics(userId, primaryToken.accessToken);

            res.json({
                success: true,
                data: {
                    platform: primaryToken.platform,
                    metrics,
                },
                message: 'Primary profile fetched successfully',
            });
        } catch (error: any) {
            console.error('Error in getPrimaryProfile:', error);
            res.status(500).json({
                success: false,
                error: 'GET_PROFILE_FAILED',
                message: error.message || 'Failed to fetch profile',
            });
        }
    }

    /**
     * GET /api/v1/creator/content
     * Get recent content from primary account
     */
    async getPrimaryContent(req: Request, res: Response): Promise<void> {
        console.log(`[ProfileController] getPrimaryContent called for user: ${(req as any).user?.id}`);
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not authenticated' });
                return;
            }

            const primaryToken = await profileService.getPrimaryAccountToken(userId);
            if (!primaryToken) {
                res.status(404).json({
                    success: false,
                    error: 'NO_PRIMARY_ACCOUNT',
                    message: 'No primary account configured',
                });
                return;
            }

            // Get platform-specific service
            const service = socialMediaFactory.getService(primaryToken.platform);

            // Fetch recent media
            const { limit = 12, after } = req.query;
            const content = await service.getUserMedia(
                userId, 
                primaryToken.accessToken, 
                Number(limit), 
                after as string
            );

            // Trigger background update of aggregated metrics (ER, Avg Reach)
            await profileService.updateAccountAggregates(userId, primaryToken.platform, primaryToken.platformId);

            // Fetch the updated account info to return fresh metrics
            const updatedAccount = await profileService.getPrimaryAccount(userId);

            res.json({
                success: true,
                data: content,
                metrics: updatedAccount ? {
                    avgReach: updatedAccount.avgReach,
                    engagementRate: updatedAccount.engagementRate
                } : undefined,
                message: 'Recent content fetched successfully',
            });
        } catch (error: any) {
            console.error('Error in getPrimaryContent:', error);
            res.status(500).json({
                success: false,
                error: 'GET_CONTENT_FAILED',
                message: error.message || 'Failed to fetch content',
            });
        }
    }

    /**
     * GET /api/v1/profile/primary/content/:mediaId/insights
     * Get deep insights for a specific media item
     */
    async getMediaInsights(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { mediaId } = req.params;
            const { mediaType } = req.query;

            if (!mediaId || !mediaType) {
                res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'mediaId and mediaType are required' });
                return;
            }

            const insights = await profileService.getMediaInsights(userId, mediaId, mediaType as string);

            res.json({
                success: true,
                data: insights,
                message: 'Media insights fetched successfully',
            });
        } catch (error: any) {
            console.error('Error in getMediaInsights:', error);
            res.status(500).json({
                success: false,
                error: 'GET_INSIGHTS_FAILED',
                message: error.message || 'Failed to fetch insights',
            });
        }
    }

    /**
     * PATCH /api/v1/creator/profile
     * Update user profile details
     */
    async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not authenticated' });
                return;
            }

            const updatedUser = await profileService.updateProfile(userId, req.body);

            res.json({
                success: true,
                data: {
                    profile: updatedUser.profile,
                    status: updatedUser.status,
                    verification: updatedUser.verification
                },
                message: 'Profile updated successfully',
            });
        } catch (error: any) {
            console.error('Error in updateProfile:', error);
            res.status(500).json({
                success: false,
                error: 'UPDATE_PROFILE_FAILED',
                message: error.message || 'Failed to update profile',
            });
        }
    }
    /**
     * PATCH /api/v1/profile/rates
     * Update deliverable rates for a specific platform
     */
    async updateRates(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not authenticated' });
                return;
            }

            const { platform, platformId, rates } = req.body;
            console.log(`[ProfileController] updateRates called for ${userId}. Platform: ${platform}, Items: ${rates?.length}`);

            if (!platform || !platformId || !Array.isArray(rates)) {
                res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'platform, platformId, and rates[] are required' });
                return;
            }

            const updatedUser = await profileService.updateRates(userId, platform, platformId, rates);
            const updatedAccount = updatedUser.socialAccounts.find(
                (acc: any) => acc.platform === platform && acc.platformId === platformId
            );

            res.json({
                success: true,
                data: { rates: updatedAccount?.rates },
                message: 'Rates updated successfully',
            });
        } catch (error: any) {
            console.error('Error in updateRates:', error);
            res.status(500).json({
                success: false,
                error: 'UPDATE_RATES_FAILED',
                message: error.message || 'Failed to update rates',
            });
        }
    }

    /**
     * PATCH /api/v1/profile/verification
     * Set verification status for profile or contact
     */
    async setVerificationStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { type, status } = req.body;

            if (!type || status === undefined) {
                res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'type and status are required' });
                return;
            }

            const updatedUser = await profileService.setVerificationStatus(userId, type, status);

            res.json({
                success: true,
                data: {
                    verification: updatedUser.verification
                },
                message: 'Verification status updated successfully',
            });
        } catch (error: any) {
            console.error('Error in setVerificationStatus:', error);
            res.status(500).json({
                success: false,
                error: 'UPDATE_VERIFICATION_FAILED',
                message: error.message || 'Failed to update verification',
            });
        }
    }

    /**
     * PATCH /api/v1/profile/status
     * Update user account status
     */
    async updateStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { status } = req.body;

            if (!status) {
                res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'status is required' });
                return;
            }

            const updatedUser = await profileService.updateStatus(userId, status);

            res.json({
                success: true,
                data: {
                    status: updatedUser.status
                },
                message: 'Account status updated successfully',
            });
        } catch (error: any) {
            console.error('Error in updateStatus:', error);
            res.status(500).json({
                success: false,
                error: 'UPDATE_STATUS_FAILED',
                message: error.message || 'Failed to update status',
            });
        }
    }
    /**
     * POST /api/v1/profile/verify/send
     * Send OTP to email or mobile
     */
    async sendVerificationOTP(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { method, contactValue } = req.body;

            if (!method || !contactValue) {
                res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'method and contactValue are required' });
                return;
            }

            const result = await profileService.sendVerificationOTP(userId, method, contactValue);
            res.json(result);
        } catch (error: any) {
            console.error('Error in sendVerificationOTP:', error);
            res.status(500).json({
                success: false,
                error: 'SEND_OTP_FAILED',
                message: error.message || 'Failed to send OTP',
            });
        }
    }

    /**
     * POST /api/v1/profile/verify/otp
     * Verify OTP for email or mobile
     */
    async verifyOTP(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { method, otpCode } = req.body;

            if (!method || !otpCode) {
                res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'method and otpCode are required' });
                return;
            }

            const result = await profileService.verifyContactOTP(userId, method, otpCode);
            res.json(result);
        } catch (error: any) {
            console.error('Error in verifyOTP:', error);
            res.status(500).json({
                success: false,
                error: 'VERIFY_OTP_FAILED',
                message: error.message || 'Failed to verify OTP',
            });
        }
    }
}

export default new ProfileController();
