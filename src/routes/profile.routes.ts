/**
 * Profile Routes
 * Endpoints for managing social media profiles and switching accounts
 */

import { Router } from 'express';
import profileController from '../controllers/profile.controller';
import { authenticateJWT } from '../middleware/jwt.middleware';

const router = Router();

/**
 * All routes require JWT authentication
 */
router.use(authenticateJWT);

/**
 * GET /api/v1/profile/accounts
 * Get all connected social media accounts
 */
router.get('/accounts', profileController.getAllAccounts.bind(profileController));

/**
 * GET /api/v1/profile/primary
 * Get current primary account details
 */
router.get('/primary', profileController.getPrimaryAccount.bind(profileController));

/**
 * POST /api/v1/profile/switch
 * Switch primary social media account
 * Body: { platform: 'INSTAGRAM', platformId: '12345' }
 */
router.post('/switch', profileController.switchPrimaryAccount.bind(profileController));

/**
 * GET /api/v1/profile/primary/content
 * Get recent content from primary account
 */
/**
 * GET /api/v1/profile/primary/content
 * Get recent content from primary account
 */
router.get('/primary/content', profileController.getPrimaryContent.bind(profileController));

/**
 * GET /api/v1/profile/primary/content/:mediaId/insights
 * Get deep insights for a specific media item
 */
router.get('/primary/content/:mediaId/insights', profileController.getMediaInsights.bind(profileController));

/**
 * PATCH /api/v1/profile
 * Update user profile details
 */
router.patch('/', profileController.updateProfile.bind(profileController));

/**
 * PATCH /api/v1/profile/rates
 * Update deliverable rates for a specific connected platform
 */
router.patch('/rates', profileController.updateRates.bind(profileController));

/**
 * PATCH /api/v1/profile/verification
 * Set verification status for profile or contact
 */
router.patch('/verification', profileController.setVerificationStatus.bind(profileController));

/**
 * POST /api/v1/profile/verify/send
 * Send verification OTP
 */
router.post('/verify/send', profileController.sendVerificationOTP.bind(profileController));

/**
 * POST /api/v1/profile/verify/otp
 * Verify OTP
 */
router.post('/verify/otp', profileController.verifyOTP.bind(profileController));

/**
 * PATCH /api/v1/profile/status
 * Update account status
 */
router.patch('/status', profileController.updateStatus.bind(profileController));

export default router;
