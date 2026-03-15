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

            res.json({
                success: true,
                data: {
                    platform: primaryAccount.platform,
                    platformId: primaryAccount.platformId,
                    username: primaryAccount.username,
                    displayName: primaryAccount.displayName,
                    profilePictureUrl: primaryAccount.profilePictureUrl,
                    followerCount: primaryAccount.followerCount,
                    accountConnectedAt: primaryAccount.accountConnectedAt,
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
}

export default new ProfileController();
