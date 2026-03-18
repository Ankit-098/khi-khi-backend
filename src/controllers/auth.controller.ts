/**
 * Auth Controller
 * Handles OAuth flow and user authentication
 */

import { Request, Response } from 'express';
import axios from 'axios';
import User, { UserRole, Platform } from '../models/User';
import { generateToken } from '../middleware/jwt.middleware';
import profileService from '../services/profile.service';
import instagramService from '../services/instagram.service';
import { dateUtils } from '../utils/date.utils';

class AuthController {
    /**
     * POST /auth/instagram/init
     * Initialize Instagram OAuth flow
     * Returns: Instagram OAuth authorization URL
     */
    async initInstagramAuth(req: Request, res: Response): Promise<void> {
        try {
            console.log('\n========== INIT AUTH START ==========');
            console.log('📝 Init Step 1: Extracting configuration...');

            const appId = process.env.INSTAGRAM_APP_ID;
            const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
            const { appRedirectUrl } = req.body;

            console.log('📝 Init Step 1: appId exists?', !!appId, appId ? `(${appId.substring(0, 5)}...)` : '');
            console.log('📝 Init Step 1: redirectUri exists?', !!redirectUri);
            console.log('📝 Init Step 1: redirectUri value:', redirectUri);
            console.log('📝 Init Step 1: appRedirectUrl extracted:', appRedirectUrl);

            if (!appId || !redirectUri) {
                console.log('❌ Init Step 1: Missing configuration');
                res.status(500).json({
                    success: false,
                    error: 'CONFIG_ERROR',
                    message: 'Instagram OAuth not configured. Missing INSTAGRAM_APP_ID or INSTAGRAM_REDIRECT_URI'
                });
                return;
            }

            console.log('✅ Init Step 1: Configuration loaded');
            console.log('📝 Init Step 2: Building OAuth scopes...');

            // Official Business Login OAuth scopes
            const scopes = [
                'instagram_business_basic',
                'instagram_business_content_publish',
                'instagram_business_manage_messages'
            ].join(',');

            console.log('📝 Init Step 2: Scopes:', scopes);
            console.log('📝 Init Step 3: Building authorization URL...');

            // Handle State for Deep Linking (appRedirectUrl passing)
            let stateParam = '';
            if (appRedirectUrl) {
                const stateObj = { appRedirectUrl };
                const stateBase64 = Buffer.from(JSON.stringify(stateObj)).toString('base64');
                stateParam = `&state=${stateBase64}`;
            }

            // ✅ Use official Instagram OAuth endpoint (from Business Login docs)
            // NOT Facebook endpoint - must use instagram.com
            const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code${stateParam}`;

            console.log('✅ Init Step 3: Authorization URL generated');
            console.log('🔐 OAuth URL:', authUrl.substring(0, 100) + '...');
            console.log('========== INIT AUTH COMPLETE ==========\n');

            res.json({
                success: true,
                data: {
                    authUrl,
                    message: 'Redirect user to this URL to authorize with Instagram'
                }
            });
        } catch (error: any) {
            console.error('❌ Error in initInstagramAuth:', error.message);
            // console.error('❌ Full error:', error);
            console.log('========== INIT AUTH FAILED ==========\n');

            res.status(500).json({
                success: false,
                error: 'INIT_AUTH_FAILED',
                message: 'Failed to initialize Instagram authentication'
            });
        }
    }

    /**
     * Handle Instagram OAuth callback
     * Accepts code from either req.body or as parameter
     * Returns: { token, user } for POST, or HTML page for GET (Expo development)
     */
    async handleInstagramCallback(code: string, res: Response, isGetRequest: boolean = false): Promise<void> {
        try {
            console.log('\n========== CALLBACK HANDLER START ==========');
            console.log('📝 Step 0: Received code:', code ? `${String(code).substring(0, 20)}...` : 'undefined');
            console.log('📝 Step 0: Code type:', typeof code);
            console.log('📝 Step 0: Code length:', code ? String(code).length : 'N/A');

            if (!code) {
                console.log('❌ Step 0: Code is missing or empty');
                res.status(400).json({
                    success: false,
                    error: 'MISSING_CODE',
                    message: 'OAuth authorization code is required'
                });
                return;
            }

            console.log('✅ Step 0: Code validation passed');
            console.log('📝 Step 1: Starting token exchange...');

            // ✅ Step 1: Exchange code for access token (includes long-lived token generation)
            const tokenResponse = await this.exchangeCodeForToken(code);
            const { access_token, user_id, expires_at } = tokenResponse;
            const platformId = String(user_id); // ✅ Ensure platformId is string for consistent matching

            console.log('✅ Step 1: Token exchange successful');
            console.log('📝 Step 2: access_token received:', access_token ? `${access_token.substring(0, 20)}...` : 'undefined');
            console.log('📝 Step 2: user_id received:', user_id);
            console.log('📝 Step 2: expires_at:', expires_at);

            if (!access_token || !user_id) {
                console.log('❌ Step 2: Missing access_token or user_id');
                res.status(401).json({
                    success: false,
                    error: 'TOKEN_EXCHANGE_FAILED',
                    message: 'Failed to obtain access token from Instagram'
                });
                return;
            }

            console.log('✅ Step 2: Token validation passed');
            console.log('📝 Step 3: Encrypting token for storage...');

            // Encrypt token before storing
            const encryptedToken = instagramService.encryptToken(access_token);
            console.log('✅ Step 3: Token encrypted successfully');
            console.log('📝 Step 4: Fetching Instagram user info...');

            // Step 2: Get Instagram user info using the service
            const instagramUser = await instagramService.getMe(access_token);

            console.log('✅ Step 4: User info fetched:', JSON.stringify({
                username: instagramUser.username,
                name: instagramUser.name,
                followers: instagramUser.followers_count
            }, null, 2));

            if (!instagramUser) {
                console.log('❌ Step 4: Failed to get Instagram user info');
                res.status(401).json({
                    success: false,
                    error: 'USER_INFO_FAILED',
                    message: 'Failed to fetch Instagram user information'
                });
                return;
            }

            console.log('✅ Step 4: User info validation passed');
            console.log('📝 Step 5: Finding or creating user in database...');

            // Step 3: Find or create user
            const email = instagramUser.email || `${instagramUser.username}@instagram.local`;

            // PRIORITY 1: Find by Instagram ID directly
            let user = await User.findOne({
                'socialAccounts.platform': Platform.INSTAGRAM,
                'socialAccounts.platformId': platformId
            });

            // PRIORITY 2: Fallback to email if not found by Instagram ID
            if (!user) {
                user = await User.findOne({ email });
            }

            if (!user) {
                console.log('📝 Step 5: User not found, creating new user with email:', email);
                // Create new user on first login
                user = new User({
                    email,
                    role: UserRole.CREATOR,
                    authMethods: ['INSTAGRAM'],
                    profile: {
                        name: instagramUser.name || instagramUser.username,
                        avatarUrl: instagramUser.profile_picture_url,
                        bio: instagramUser.biography
                    },
                    socialAccounts: [
                        {
                            platform: Platform.INSTAGRAM,
                            platformId: user_id,
                            username: instagramUser.username,
                            displayName: instagramUser.name,
                            profilePictureUrl: instagramUser.profile_picture_url,
                            bio: instagramUser.biography,
                            followerCount: instagramUser.followers_count || 0,
                            followingCount: instagramUser.follows_count || 0,
                            mediaCount: instagramUser.media_count || 0,
                            isBusinessAccount: true,  // Assume all authenticated business accounts
                            accessToken: encryptedToken,  // ✅ Store encrypted token
                            tokenExpiry: expires_at,  // ✅ Track token expiry (60 days from now)
                            permissions: ['instagram_business_basic'],
                            accountConnectedAt: new Date(),
                            isPrimary: true  // First account is always primary
                        }
                    ]
                });

                await user.save();
                console.log('✅ Step 5: New user created, ID:', user._id.toString());
            } else {
                console.log('📝 Step 5: User found, ID:', user._id.toString());
                // Add Instagram account if not already connected
                const existingAccount = user.socialAccounts.find(
                    acc => acc.platform === Platform.INSTAGRAM && acc.platformId === platformId
                );

                if (existingAccount) {
                    console.log('📝 Step 5: Updating existing Instagram account');
                    // Update existing account
                    existingAccount.accessToken = encryptedToken;  // ✅ Store encrypted token
                    existingAccount.tokenExpiry = expires_at;  // ✅ Track token expiry (60 days from now)
                    existingAccount.followerCount = instagramUser.followers_count || 0;
                    existingAccount.followingCount = instagramUser.follows_count || 0;
                    existingAccount.mediaCount = instagramUser.media_count || 0;
                    existingAccount.lastLogin = new Date(); // ✅ Update account specific login time
                } else {
                    console.log('📝 Step 5: Adding new Instagram account to existing user');
                    // Add new Instagram account
                    user.socialAccounts.push({
                        platform: Platform.INSTAGRAM,
                        platformId: user_id,
                        username: instagramUser.username,
                        displayName: instagramUser.name,
                        profilePictureUrl: instagramUser.profile_picture_url,
                        bio: instagramUser.biography,
                        followerCount: instagramUser.followers_count || 0,
                        followingCount: instagramUser.follows_count || 0,
                        mediaCount: instagramUser.media_count || 0,
                        isBusinessAccount: true,  // Assume all authenticated business accounts
                        accessToken: encryptedToken,  // ✅ Store encrypted token
                        tokenExpiry: expires_at,  // ✅ Track token expiry (60 days from now)
                        permissions: ['instagram_business_basic'],
                        accountConnectedAt: new Date(),
                        lastLogin: new Date(), // ✅ Initialize last login
                        isPrimary: false  // Set as primary if this is first account
                    });

                    // Set as primary if no primary account exists
                    await profileService.setAsPrimaryIfFirstAccount(
                        user._id.toString(),
                        Platform.INSTAGRAM,
                        platformId
                    );
                }

                // Update auth methods if not already listed
                if (!user.authMethods.includes('INSTAGRAM')) {
                    user.authMethods.push('INSTAGRAM');
                }

                user.lastLogin = new Date(); // Update last login time
                await user.save();
                console.log('✅ Step 5: User updated successfully');
            }

            console.log('✅ Step 5: Database operations complete');
            console.log('📝 Step 6: Generating JWT token...');

            // Step 4: Generate JWT token
            const token = generateToken(
                user._id.toString(),
                user.email,
                user.role
            );

            console.log('✅ Step 6: JWT token generated:', `${token.substring(0, 20)}...`);
            console.log('📝 Step 7: Sending success response...');

            // Step 5: Return success response
            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.profile.name,
                        role: user.role,
                        primaryAccount: user.primaryAccount,
                        socialAccounts: user.socialAccounts.map(acc => ({
                            platform: acc.platform,
                            username: acc.username,
                            displayName: acc.displayName,
                            profilePictureUrl: acc.profilePictureUrl,
                            isPrimary: acc.isPrimary
                        }))
                    }
                },
                message: 'Successfully authenticated with Instagram'
            });
            console.log('✅ Step 7: Response sent successfully');
            console.log('========== CALLBACK HANDLER COMPLETE ==========\n');

            // For GET requests (from browser during Expo development), return HTML with instructions
            if (isGetRequest) {
                const htmlResponse = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Creator Ecosystem - Login Successful</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            max-width: 500px;
                            text-align: center;
                        }
                        h1 {
                            color: #333;
                            margin: 0 0 10px 0;
                        }
                        .success-icon {
                            font-size: 48px;
                            margin-bottom: 20px;
                        }
                        .message {
                            color: #666;
                            margin-bottom: 30px;
                            line-height: 1.6;
                        }
                        .code-section {
                            background: #f5f5f5;
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        .code-label {
                            color: #999;
                            font-size: 12px;
                            text-transform: uppercase;
                            margin-bottom: 10px;
                        }
                        .code-box {
                            background: white;
                            padding: 15px;
                            border: 2px solid #667eea;
                            border-radius: 6px;
                            font-family: 'Courier New', monospace;
                            font-size: 14px;
                            word-break: break-all;
                            color: #333;
                            margin-bottom: 15px;
                        }
                        .copy-btn {
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.3s;
                        }
                        .copy-btn:hover {
                            background: #764ba2;
                        }
                        .close-btn {
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 12px 30px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 600;
                            margin-top: 20px;
                            transition: background 0.3s;
                        }
                        .close-btn:hover {
                            background: #218838;
                        }
                        .expo-instructions {
                            background: #fff3cd;
                            border: 1px solid #ffc107;
                            padding: 15px;
                            border-radius: 6px;
                            margin-top: 20px;
                            text-align: left;
                            font-size: 13px;
                            color: #856404;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">✅</div>
                        <h1>Login Successful!</h1>
                        <p class="message">
                            Your Instagram account has been authenticated.<br>
                            Your authorization code is ready.
                        </p>
                        
                        <div class="code-section">
                            <div class="code-label">Authorization Code (for Expo development)</div>
                            <div class="code-box" id="codeBox">${code}</div>
                            <button class="copy-btn" onclick="copyCode()">📋 Copy Code</button>
                        </div>

                        <div class="expo-instructions">
                            <strong>📱 For Expo Development:</strong>
                            <ol style="margin: 10px 0; padding-left: 20px;">
                                <li>Copy the authorization code above</li>
                                <li>Switch back to your app</li>
                                <li>Click "Debug Mode" toggle (if needed)</li>
                                <li>Paste the code in the manual code entry field</li>
                                <li>Click "Exchange Code"</li>
                            </ol>
                        </div>

                        <button class="close-btn" onclick="closeWindow()">✓ Close Browser</button>
                    </div>

                    <script>
                        function copyCode() {
                            const codeBox = document.getElementById('codeBox');
                            const code = codeBox.textContent;
                            navigator.clipboard.writeText(code).then(() => {
                                alert('Code copied to clipboard!');
                            });
                        }
                        
                        function closeWindow() {
                            window.close();
                        }
                    </script>
                </body>
                </html>
                `;
                console.log('📄 [GET CALLBACK] Returning HTML success page for Expo development');
                res.set('Content-Type', 'text/html');
                res.send(htmlResponse);
                return;
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error_message ||
                error.response?.data?.message ||
                error.message ||
                'Unknown error';

            console.error('❌ ERROR in handleInstagramCallback:', errorMsg);
            // console.error('❌ Full error:', error);

            if (error.response?.data) {
                console.error('📋 Details:', error.response.data);
            }

            res.status(500).json({
                success: false,
                error: 'CALLBACK_FAILED',
                message: 'Failed to process Instagram OAuth callback'
            });
            console.log('========== CALLBACK HANDLER FAILED ==========\n');
        }
    }

    /**
     * Process Instagram OAuth callback (returns data without sending response)
     * Used by GET handler which sends its own HTML response
     */
    async processInstagramCallback(code: string): Promise<any> {
        console.log('\n========== CALLBACK PROCESSOR START ==========');
        console.log('📝 Step 0: Received code:', code ? `${String(code).substring(0, 20)}...` : 'undefined');

        if (!code) {
            throw new Error('OAuth authorization code is required');
        }

        console.log('✅ Step 0: Code validation passed');
        console.log('📝 Step 1: Starting token exchange...');

        // Step 1: Exchange code for access token
        const tokenResponse = await this.exchangeCodeForToken(code);
        const { access_token, user_id, expires_at, permissions: rawPermissions } = tokenResponse;
        const platformId = String(user_id); // ✅ Ensure platformId is string

        // Normalize permissions to an array of strings
        const permissions: string[] = Array.isArray(rawPermissions) 
            ? rawPermissions 
            : (typeof rawPermissions === 'string' ? rawPermissions.split(',') : []);

        console.log('✅ Step 1: Token exchange successful');
        console.log('📝 Step 2: access_token received:', access_token ? `${access_token.substring(0, 20)}...` : 'undefined');
        console.log('📝 Step 2: user_id received:', user_id);
        console.log('📝 Step 2: Permissions granted:', permissions);

        if (!access_token || !user_id) {
            throw new Error('Failed to obtain access token from Instagram');
        }

        console.log('✅ Step 2: Token validation passed');
        console.log('📝 Step 3: Encrypting token for storage...');

        // Encrypt token before storing
        const encryptedToken = instagramService.encryptToken(access_token);
        console.log('✅ Step 3: Token encrypted successfully');
        console.log('📝 Step 4: Fetching Instagram user info...');

        // Step 2: Get Instagram user info
        const instagramUser = await instagramService.getMe(access_token);

        console.log('✅ Step 4: User info fetched:', JSON.stringify({
            username: instagramUser.username,
            name: instagramUser.name,
            followers: instagramUser.followers_count
        }, null, 2));

        if (!instagramUser) {
            throw new Error('Failed to fetch Instagram user information');
        }

        console.log('✅ Step 4: User info validation passed');
        console.log('📝 Step 5: Finding or creating user in database...');

        // Step 3: Find or create user
        const email = instagramUser.email || `${instagramUser.username}@instagram.local`;

        // PRIORITY 1: Find by Instagram ID directly
        let user = await User.findOne({
            'socialAccounts.platform': Platform.INSTAGRAM,
            'socialAccounts.platformId': platformId
        });

        // PRIORITY 2: Fallback to email if not found by Instagram ID
        if (!user) {
            user = await User.findOne({ email });
        }

        if (!user) {
            console.log('📝 Step 5: User not found, creating new user with email:', email);
            user = new User({
                email,
                role: UserRole.CREATOR,
                authMethods: ['INSTAGRAM'],
                profile: {
                    name: instagramUser.name || instagramUser.username,
                    avatarUrl: instagramUser.profile_picture_url,
                    bio: instagramUser.biography
                },
                socialAccounts: [
                    {
                        platform: Platform.INSTAGRAM,
                        platformId: user_id,
                        username: instagramUser.username,
                        displayName: instagramUser.name,
                        profilePictureUrl: instagramUser.profile_picture_url,
                        bio: instagramUser.biography,
                        followerCount: instagramUser.followers_count || 0,
                        followingCount: instagramUser.follows_count || 0,
                        mediaCount: instagramUser.media_count || 0,
                        isBusinessAccount: true,
                        accessToken: encryptedToken,
                        tokenExpiry: expires_at,
                        permissions: permissions,
                        accountConnectedAt: dateUtils.now().toDate(),
                        isPrimary: true
                    }
                ]
            });

            await user.save();
            console.log('✅ Step 5: New user created, ID:', user._id.toString());
        } else {
            console.log('📝 Step 5: User found, ID:', user._id.toString());
            const existingAccount = user.socialAccounts.find(
                acc => acc.platform === Platform.INSTAGRAM && acc.platformId === platformId
            );

            if (existingAccount) {
                console.log('📝 Step 5b: Instagram account already connected, updating token...');
                existingAccount.accessToken = encryptedToken;
                existingAccount.tokenExpiry = expires_at;
                existingAccount.permissions = permissions; // Update permissions as well
                existingAccount.lastLogin = dateUtils.now().toDate(); // ✅ Update last login
            } else {
                console.log('📝 Step 5b: Instagram account not found, adding new account...');
                user.socialAccounts.push({
                    platform: Platform.INSTAGRAM,
                    platformId: user_id,
                    username: instagramUser.username,
                    displayName: instagramUser.name,
                    profilePictureUrl: instagramUser.profile_picture_url,
                    bio: instagramUser.biography,
                    followerCount: instagramUser.followers_count || 0,
                    followingCount: instagramUser.follows_count || 0,
                    mediaCount: instagramUser.media_count || 0,
                    isBusinessAccount: true,
                    accessToken: encryptedToken,
                    tokenExpiry: expires_at,
                    permissions: permissions,
                    accountConnectedAt: dateUtils.now().toDate(),
                    lastLogin: dateUtils.now().toDate(), // ✅ Initialize last login
                    isPrimary: user.socialAccounts.length === 0
                } as any);
            }

            user.lastLogin = dateUtils.now().toDate(); // Update last login time
            await user.save();
            console.log('✅ Step 5b: User updated with Instagram account');
        }

        console.log('✅ Step 6: User in database ready');
        console.log('📝 Step 7: Generating JWT token...');

        // Step 4: Generate JWT token
        const token = generateToken(
            user._id.toString(),
            user.email,
            user.role
        );

        console.log('✅ Step 6: JWT token generated:', `${token.substring(0, 20)}...`);
        console.log('========== CALLBACK PROCESSOR COMPLETE ==========\n');

        return {
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.profile.name,
                role: user.role,
                primaryAccount: user.primaryAccount,
                socialAccounts: user.socialAccounts.map(acc => ({
                    platform: acc.platform,
                    username: acc.username,
                    displayName: acc.displayName,
                    profilePictureUrl: acc.profilePictureUrl,
                    isPrimary: acc.isPrimary
                }))
            }
        };
    }

    /**
     * Exchange OAuth code for access token
     */
    private async exchangeCodeForToken(code: string): Promise<any> {
        try {
            console.log('\n========== TOKEN EXCHANGE START ==========');
            console.log('📝 Exchange Step 1: Extracting environment variables...');

            const appId = process.env.INSTAGRAM_APP_ID;
            const appSecret = process.env.INSTAGRAM_APP_SECRET;
            const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

            console.log('📝 Exchange Step 1: appId exists?', !!appId);
            console.log('📝 Exchange Step 1: appSecret exists?', !!appSecret);
            console.log('📝 Exchange Step 1: redirectUri exists?', !!redirectUri);
            console.log('📝 Exchange Step 1: redirectUri value:', redirectUri);

            if (!appId || !appSecret || !redirectUri) {
                console.log('❌ Exchange Step 1: Missing configuration');
                throw new Error('Missing Instagram OAuth configuration');
            }

            console.log('✅ Exchange Step 1: All configuration loaded');
            console.log('📝 Exchange Step 2: Preparing token exchange request...');

            const requestBody = new URLSearchParams({
                client_id: appId,
                client_secret: appSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code
            }).toString();

            console.log('📝 Exchange Step 2: Request body prepared:', requestBody.substring(0, 50) + '...');
            console.log('📝 Exchange Step 2: Request URL: https://api.instagram.com/oauth/access_token');
            console.log('📝 Exchange Step 3: Sending POST request to Instagram...');

            // ✅ Step 2: Exchange code for SHORT-LIVED token (official Business Login endpoint)
            // NOTE: Instagram requires form-urlencoded data, not query params
            const shortLivedResponse = await axios.post(
                'https://api.instagram.com/oauth/access_token',
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            console.log('✅ Exchange Step 3: Instagram responded with status:', shortLivedResponse.status);
            console.log('📱 Exchange Step 4: Raw Instagram response:', JSON.stringify(shortLivedResponse.data, null, 2));

            // ✅ Handle different response formats
            // Format 1: Nested array { data: [{ access_token, user_id, ... }] }
            // Format 2: Direct object { access_token, user_id, ... }
            let shortLivedData;

            console.log('📝 Exchange Step 4: Parsing response...');
            console.log('📝 Exchange Step 4: Has data.data array?', shortLivedResponse.data.data && Array.isArray(shortLivedResponse.data.data));
            console.log('📝 Exchange Step 4: Has direct access_token?', !!shortLivedResponse.data.access_token);

            if (shortLivedResponse.data.data && Array.isArray(shortLivedResponse.data.data)) {
                console.log('📝 Exchange Step 4: Using nested array format');
                shortLivedData = shortLivedResponse.data.data[0];
            } else if (shortLivedResponse.data.access_token) {
                // Direct format
                console.log('📝 Exchange Step 4: Using direct object format');
                shortLivedData = shortLivedResponse.data;
            } else {
                console.log('❌ Exchange Step 4: Unexpected response format');
                throw new Error(`Unexpected response format: ${JSON.stringify(shortLivedResponse.data)}`);
            }

            console.log('✅ Exchange Step 4: Response parsed successfully');
            console.log('📝 Exchange Step 5: Short-lived token received:', {
                user_id: shortLivedData.user_id,
                permissions: shortLivedData.permissions,
                access_token: shortLivedData.access_token ? `${shortLivedData.access_token.substring(0, 20)}...` : 'undefined'
            });

            // ✅ Step 3: Exchange SHORT-LIVED token for LONG-LIVED token (60 days)
            // Required by Business Login - tokens expire after 1 hour without this step
            console.log('📝 Exchange Step 6: Exchanging for long-lived token...');

            const longLivedResponse = await axios.get('https://graph.instagram.com/access_token', {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: appSecret,
                    access_token: shortLivedData.access_token
                }
            });

            console.log('✅ Exchange Step 6: Long-lived token request successful');
            console.log('📝 Exchange Step 7: Long-lived response:', JSON.stringify(longLivedResponse.data, null, 2));

            const longLivedData = longLivedResponse.data;
            const expiresAt = dateUtils.add(dateUtils.now(), longLivedData.expires_in, 'seconds').toDate();

            console.log('🔐 Exchange Step 7: Token Exchange Complete:', {
                userId: shortLivedData.user_id,
                shortLivedExpiry: '1 hour',
                longLivedExpiry: `${Math.floor(longLivedData.expires_in / 86400)} days`,
                tokenExpiresAt: expiresAt.toISOString(),
                access_token: longLivedData.access_token ? `${longLivedData.access_token.substring(0, 20)}...` : 'undefined'
            });

            const result = {
                access_token: longLivedData.access_token,  // Use LONG-LIVED token
                user_id: shortLivedData.user_id,
                permissions: shortLivedData.permissions,
                expires_in: longLivedData.expires_in,
                expires_at: expiresAt
            };

            console.log('========== TOKEN EXCHANGE COMPLETE ==========\n');
            return result;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error_message ||
                error.response?.data?.message ||
                error.message ||
                'Unknown error';

            console.error('❌ ERROR in exchangeCodeForToken:', errorMsg);
            console.error('❌ Full error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            if (error.response?.data) {
                console.error('📋 Instagram returned:', error.response.data);
            }

            console.log('========== TOKEN EXCHANGE FAILED ==========\n');
            throw error;
        }
    }

    /**
     * NOTE: User info fetching is now handled by InstagramService
     * See: src/services/instagram.service.ts -> getMe()
     * Provides: encryption/decryption, error handling, and standardized API calls
     */

    /**
     * GET /auth/refresh
     * Refresh JWT token
     */
    async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'User not authenticated'
                });
                return;
            }

            const user = await User.findById(userId);

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'User not found'
                });
                return;
            }

            const token = generateToken(
                user._id.toString(),
                user.email,
                user.role
            );

            res.json({
                success: true,
                data: { token },
                message: 'Token refreshed successfully'
            });
        } catch (error) {
            console.error('Error in refreshToken:', error);
            res.status(500).json({
                success: false,
                error: 'REFRESH_FAILED',
                message: 'Failed to refresh token'
            });
        }
    }

    /**
     * GET /auth/me
     * Get current user info
     */
    async getCurrentUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'User not authenticated'
                });
                return;
            }

            const user = await User.findById(userId).select('-socialAccounts.accessToken -socialAccounts.refreshToken');

            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'User not found'
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: user._id.toString(),
                    email: user.email,
                    role: user.role,
                    profile: user.profile,
                    primaryAccount: user.primaryAccount,
                    socialAccounts: user.socialAccounts.map(acc => ({
                        platform: acc.platform,
                        platformId: acc.platformId,
                        username: acc.username,
                        displayName: acc.displayName,
                        followerCount: acc.followerCount,
                        isPrimary: acc.isPrimary,
                        rates: acc.rates
                    }))
                },
                message: 'User retrieved successfully'
            });
        } catch (error) {
            console.error('Error in getCurrentUser:', error);
            res.status(500).json({
                success: false,
                error: 'FETCH_USER_FAILED',
                message: 'Failed to fetch current user'
            });
        }
    }

    /**
     * POST /auth/logout
     * Logout user (client-side token deletion)
     */
    logout(req: Request, res: Response): void {
        res.json({
            success: true,
            message: 'Logged out successfully. Please delete the token on client side.'
        });
    }
}

export default new AuthController();
