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
 * GET /api/v1/profile/primary/profile
 * Get primary account profile with real-time metrics
 */
router.get('/primary/profile', profileController.getPrimaryProfile.bind(profileController));

export default router;
