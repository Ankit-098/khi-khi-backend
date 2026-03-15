/**
 * Example implementations of Instagram Service usage
 * Copy and adapt these examples for your own routes/controllers
 */

import { Request, Response } from 'express';
import {
    callInstagramAPI,
    getInstagramAccessToken,
    isInstagramTokenExpiringsoon
} from '../services/instagram-token.helper';

/**
 * EXAMPLE 1: Get user's posts and display metrics
 * GET /api/instagram/posts
 * Query: ?userId=... &platformId=...
 */
export async function getInstagramPosts(req: Request, res: Response): Promise<void> {
    try {
        const { userId, platformId } = req.query;

        if (!userId || !platformId) {
            res.status(400).json({
                success: false,
                error: 'Missing userId or platformId'
            });
            return;
        }

        console.log('📝 Fetching Instagram posts for user:', userId);

        // Use the helper to automatically decrypt token and call API
        const media = await callInstagramAPI(
            userId as string,
            platformId as string,
            'getUserMedia',
            { limit: 20 }
        );

        res.json({
            success: true,
            data: {
                media,
                count: media.length,
                totalLikes: media.reduce((sum: number, item: any) => sum + (item.like_count || 0), 0),
                totalComments: media.reduce((sum: number, item: any) => sum + (item.comments_count || 0), 0)
            }
        });
    } catch (error: any) {
        console.error('❌ Error fetching posts:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * EXAMPLE 2: Get user profile and check token expiry
 * GET /api/instagram/profile
 * Query: ?userId=... &platformId=...
 */
export async function getInstagramProfile(req: Request, res: Response): Promise<void> {
    try {
        const { userId, platformId } = req.query;

        if (!userId || !platformId) {
            res.status(400).json({
                success: false,
                error: 'Missing userId or platformId'
            });
            return;
        }

        console.log('📝 Fetching Instagram profile for user:', userId);

        // Get user info
        const userInfo = await callInstagramAPI(
            userId as string,
            platformId as string,
            'getMe'
        );

        // Check token expiry
        const tokenExpiringSoon = await isInstagramTokenExpiringsoon(
            userId as string,
            platformId as string
        );

        res.json({
            success: true,
            data: {
                user: userInfo,
                tokenStatus: {
                    expiringSoon: tokenExpiringSoon,
                    warning: tokenExpiringSoon ? 'Token expires within 7 days' : null
                }
            }
        });
    } catch (error: any) {
        console.error('❌ Error fetching profile:', error.message);
        
        // Special handling for expired tokens
        if (error.message.includes('expired')) {
            res.status(401).json({
                success: false,
                error: 'TOKEN_EXPIRED',
                message: 'Your Instagram token has expired. Please re-authenticate.'
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * EXAMPLE 3: Get performance insights
 * GET /api/instagram/insights
 * Query: ?userId=... &platformId=... &metric=impressions
 */
export async function getInstagramInsights(req: Request, res: Response): Promise<void> {
    try {
        const { userId, platformId, metric = 'impressions' } = req.query;

        if (!userId || !platformId) {
            res.status(400).json({
                success: false,
                error: 'Missing userId or platformId'
            });
            return;
        }

        console.log(`📊 Fetching Instagram ${metric} insights for user:`, userId);

        // Get insights data
        const insights = await callInstagramAPI(
            userId as string,
            platformId as string,
            'getUserInsights',
            { metric: metric as string }
        );

        // Process insights data
        let summary = null;
        if (insights && insights.length > 0) {
            const values = insights[0].values || [];
            summary = {
                metric: metric,
                dataPoints: values.length,
                totalValue: values.reduce((sum: any, item: any) => sum + (item.value || 0), 0),
                latestValue: values[0]?.value,
                latestDate: values[0]?.end_time
            };
        }

        res.json({
            success: true,
            data: {
                insights,
                summary
            }
        });
    } catch (error: any) {
        console.error('❌ Error fetching insights:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * EXAMPLE 4: Direct token access for advanced use cases
 * GET /api/instagram/token
 * Query: ?userId=... &platformId=...
 * 
 * Use this when you need the actual token for custom operations
 */
export async function getInstagramToken(req: Request, res: Response): Promise<void> {
    try {
        const { userId, platformId } = req.query;

        if (!userId || !platformId) {
            res.status(400).json({
                success: false,
                error: 'Missing userId or platformId'
            });
            return;
        }

        console.log('🔐 Retrieving Instagram access token for user:', userId);

        // Get decrypted token
        const token = await getInstagramAccessToken(
            userId as string,
            platformId as string
        );

        res.json({
            success: true,
            data: {
                access_token: token.substring(0, 20) + '...',  // Return partial for security
                note: 'Use this token for custom API calls',
                prefix: token.substring(0, 20),
                suffix: token.substring(token.length - 10)
            }
        });
    } catch (error: any) {
        console.error('❌ Error retrieving token:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * EXAMPLE 5: Compare multiple accounts (multi-account support)
 * GET /api/instagram/compare-accounts
 * Query: ?userId=...
 */
export async function compareInstagramAccounts(req: Request, res: Response): Promise<void> {
    try {
        const { userId } = req.query;

        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'Missing userId'
            });
            return;
        }

        console.log('📊 Comparing all Instagram accounts for user:', userId);

        // Fetch full user document with all social accounts
        const User = require('../models/User').default;
        const user = await User.findById(userId);

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }

        // Get data for all Instagram accounts
        const accountsData = await Promise.allSettled(
            user.socialAccounts
                .filter((acc: any) => acc.platform === 'INSTAGRAM')
                .map((acc: any) =>
                    callInstagramAPI(userId as string, acc.platformId, 'getMe')
                )
        );

        // Process results
        const results = accountsData.map((result: any, index: number) => {
            if (result.status === 'fulfilled') {
                return {
                    account: user.socialAccounts[index],
                    data: result.value,
                    status: 'success'
                };
            } else {
                return {
                    account: user.socialAccounts[index],
                    error: result.reason.message,
                    status: 'failed'
                };
            }
        });

        res.json({
            success: true,
            data: {
                totalAccounts: user.socialAccounts.filter((acc: any) => acc.platform === 'INSTAGRAM').length,
                accounts: results,
                primaryAccount: user.primaryAccount
            }
        });
    } catch (error: any) {
        console.error('❌ Error comparing accounts:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * EXAMPLE 6: Refresh token check and alert
 * POST /api/instagram/check-token-renewal
 * Body: { userId, platformId }
 */
export async function checkTokenRenewal(req: Request, res: Response): Promise<void> {
    try {
        const { userId, platformId } = req.body;

        if (!userId || !platformId) {
            res.status(400).json({
                success: false,
                error: 'Missing userId or platformId'
            });
            return;
        }

        console.log('⏰ Checking token renewal status for user:', userId);

        // Check if expiring soon
        const expiringSoon = await isInstagramTokenExpiringSoon(userId, platformId);

        if (expiringSoon) {
            console.log('⚠️  Token expiring soon - should trigger refresh');

            // TODO: Implement token refresh logic here
            // This would call Instagram API to exchange old token for new one
            // Then update database with new encrypted token

            res.json({
                success: true,
                data: {
                    status: 'EXPIRING_SOON',
                    action_needed: true,
                    message: 'Access token expires within 7 days. Please re-authenticate to refresh.',
                    recommendation: 'Redirect user to re-authenticate'
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    status: 'VALID',
                    action_needed: false,
                    message: 'Access token is valid'
                }
            });
        }
    } catch (error: any) {
        console.error('❌ Error checking token renewal:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * EXAMPLE 7: Custom API call for unsupported endpoints
 * POST /api/instagram/custom
 * Body: { userId, platformId, endpoint, method, data }
 * 
 * For endpoints not yet implemented in the service
 */
export async function customInstagramAPI(req: Request, res: Response): Promise<void> {
    try {
        const { userId, platformId, endpoint, method = 'get', data } = req.body;

        if (!userId || !platformId || !endpoint) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, platformId, endpoint'
            });
            return;
        }

        if (!['get', 'post'].includes(method)) {
            res.status(400).json({
                success: false,
                error: 'Method must be "get" or "post"'
            });
            return;
        }

        console.log(`📝 Making custom Instagram API ${method.toUpperCase()} call to ${endpoint}`);

        // Make custom API call
        const result = await callInstagramAPI(
            userId,
            platformId,
            method as 'get' | 'post',
            {
                endpoint,
                ...(method === 'get' ? { queryParams: data } : { data })
            }
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('❌ Error making custom API call:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * HOW TO USE THESE EXAMPLES:
 * 
 * 1. Create a routes file (e.g., instagram.routes.ts):
 * 
 * import { Router } from 'express';
 * import {
 *     getInstagramPosts,
 *     getInstagramProfile,
 *     getInstagramInsights,
 *     compareInstagramAccounts,
 *     checkTokenRenewal
 * } from '../controllers/instagram.controller';
 * 
 * const router = Router();
 * router.get('/posts', getInstagramPosts);
 * router.get('/profile', getInstagramProfile);
 * router.get('/insights', getInstagramInsights);
 * router.get('/compare', compareInstagramAccounts);
 * router.post('/check-renewal', checkTokenRenewal);
 * 
 * export default router;
 * 
 * 2. Register in main app file (index.ts):
 * 
 * import instagramRoutes from './routes/instagram.routes';
 * app.use('/api/instagram', instagramRoutes);
 * 
 * 3. Call from frontend:
 * 
 * const response = await fetch('/api/instagram/posts?userId=xyz&platformId=123');
 * const data = await response.json();
 * console.log(data.data.media);
 */
