import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/jwt.middleware';

const router = Router();

/**
 * OAuth Flow Endpoints
 * 
 * React Native Flow (with deep linking):
 * 1. POST /instagram/init → Get authUrl
 * 2. Redirect user to authUrl (Instagram login page)
 * 3. Instagram redirects to creator-app://auth/callback?code=...
 * 4. App detects deep link, extracts code
 * 5. POST /instagram/callback with code → Get JWT token
 * 
 * Web Server Flow (direct HTTPS redirect):
 * 1. POST /instagram/init → Get authUrl
 * 2. Redirect user to authUrl (Instagram login page)
 * 3. Instagram redirects (GET) to /instagram/callback?code=...
 * 4. Backend processes code and returns response/redirects
 */

// POST /auth/instagram/init
// Get Instagram OAuth authorization URL
router.post('/instagram/init', async (req, res) => {
    await authController.initInstagramAuth(req, res);
});

// GET /auth/instagram/callback
// Handle direct Instagram OAuth redirect (for web server flow)
// Query: code=... (from Instagram redirect)
// For Expo development: Returns HTML page with authorization code
router.get('/instagram/callback', async (req, res) => {
    try {
        console.log('🔵 [GET CALLBACK] Full query params:', JSON.stringify(req.query, null, 2));
        
        const { code, state, error, error_description } = req.query as any;
        
        // 1. Validate Code
        if (!code) {
            console.log('❌ [GET CALLBACK] No code found in query params');
            res.setHeader('Content-Type', 'text/html');
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Missing Authorization Code</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background: #ff6b6b;
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            max-width: 400px;
                            text-align: center;
                        }
                        h1 { color: #e74c3c; margin-top: 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Error</h1>
                        <p>No authorization code was provided</p>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                    </div>
                </body>
                </html>
            `);
        }

        // 2. Process callback and get auth data immediately (Update DB, generate token)
        console.log('🔵 [GET CALLBACK] Processing auth data in backend...');
        const authData = await authController.processInstagramCallback(code as string);
        console.log('✅ [GET CALLBACK] Auth data processed successfully');

        // 3. Handle Deep Linking Redirect if requested
        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
                if (decodedState.appRedirectUrl) {
                    console.log('🔵 [GET CALLBACK] Extracted appRedirectUrl from state:', decodedState.appRedirectUrl);
                    
                    // Construct deeply linked redirect URL to pass to Expo Go
                    const appUrl = new URL(decodedState.appRedirectUrl);
                    
                    // Provide BOTH code (for compatibility) and token/user (for immediate login)
                    appUrl.searchParams.append('code', code as string);
                    if (authData?.token) appUrl.searchParams.append('token', authData.token);
                    if (authData?.user) appUrl.searchParams.append('user', JSON.stringify(authData.user));
                    
                    if (error) appUrl.searchParams.append('error', error as string);
                    if (error_description) appUrl.searchParams.append('error_description', error_description as string);
                    
                    console.log('🔵 [GET CALLBACK] Proxying (redirecting) to:', appUrl.toString());
                    
                    // Return HTML with meta-refresh AND location redirect for maximum compatibility
                    res.setHeader('Content-Type', 'text/html');
                    return res.send(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta http-equiv="refresh" content="0;url=${appUrl.toString()}">
                            <title>Redirecting to App...</title>
                            <script>
                                setTimeout(function() {
                                    window.location.href = "${appUrl.toString()}";
                                }, 100);
                            </script>
                        </head>
                        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fdfdfd;">
                            <div style="text-align: center;">
                                <div style="font-size: 24px; margin-bottom: 20px;">🚀</div>
                                <h2>Login Successful</h2>
                                <p style="color: #666;">Opening the app... If it doesn't open automatically, <a href="${appUrl.toString()}" style="color: #1a2fa0; font-weight: bold;">click here</a>.</p>
                            </div>
                        </body>
                        </html>
                    `);
                }
            } catch (err) {
                console.error('❌ [GET CALLBACK] Failed to parse state or redirect', err);
            }
        }

        // Process callback and get auth data (if not already done by deep link catch)
        // If we reached here, no deep link was triggered or this is a manual browser session
        console.log('📄 [GET CALLBACK] No state/redirect, showing success HTML');
        res.setHeader('Content-Type', 'text/html');
        res.send(`
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
                        background: linear-gradient(135deg, #1a2fa0 0%, #030508 100%);
                        color: white;
                    }
                    .container {
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        padding: 40px;
                        border-radius: 24px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                        max-width: 500px;
                        text-align: center;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    h1 {
                        color: white;
                        margin: 0 0 10px 0;
                    }
                    .success-icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .message {
                        color: rgba(255, 255, 255, 0.8);
                        margin-bottom: 30px;
                        line-height: 1.6;
                    }
                    .code-section {
                        background: rgba(0, 0, 0, 0.3);
                        padding: 20px;
                        border-radius: 16px;
                        margin: 20px 0;
                    }
                    .code-label {
                        color: rgba(255, 255, 255, 0.5);
                        font-size: 12px;
                        text-transform: uppercase;
                        margin-bottom: 15px;
                    }
                    .code-box {
                        background: rgba(255, 255, 255, 0.05);
                        padding: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 12px;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        word-break: break-all;
                        color: #a8ccf0;
                        margin-bottom: 15px;
                    }
                    .copy-btn {
                        background: #a8ccf0;
                        color: #1a2fa0;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 700;
                        transition: all 0.3s;
                    }
                    .copy-btn:hover {
                        opacity: 0.9;
                        transform: translateY(-2px);
                    }
                    .close-btn {
                        background: white;
                        color: #1a2fa0;
                        border: none;
                        padding: 16px 40px;
                        border-radius: 16px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: 700;
                        margin-top: 20px;
                        transition: all 0.3s;
                    }
                    .close-btn:hover {
                        transform: scale(1.05);
                    }
                    .expo-instructions {
                        background: rgba(168, 204, 240, 0.1);
                        border: 1px solid rgba(168, 204, 240, 0.2);
                        padding: 20px;
                        border-radius: 16px;
                        margin-top: 20px;
                        text-align: left;
                        font-size: 13px;
                        color: rgba(255, 255, 255, 0.7);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✨</div>
                    <h1>Authenticated!</h1>
                    <p class="message">
                        Your account has been successfully connected.
                    </p>
                    
                    <div class="code-section">
                        <div class="code-label">Access Code</div>
                        <div class="code-box" id="codeBox">${code}</div>
                        <button class="copy-btn" onclick="copyCode()">📋 Copy Code</button>
                    </div>
 
                    <div class="expo-instructions">
                        <strong>📱 Switch to App</strong>
                        <p>Close this browser and return to the <b>Khi Khi</b> app to continue.</p>
                    </div>
 
                    <button class="close-btn" onclick="closeWindow()">Done</button>
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
                        // Fallback message
                        document.querySelector('.container').innerHTML = "<h1>Browser Closed</h1><p>Returning to app...</p>";
                    }
                </script>
            </body>
            </html>
        `);
    } catch (error: any) {
        console.error('❌ [GET CALLBACK] Exception caught:', error.message);
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Error</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #ff6b6b;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        max-width: 400px;
                        text-align: center;
                    }
                    h1 { color: #e74c3c; margin-top: 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Error</h1>
                    <p>${error.message}</p>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                </div>
            </body>
            </html>
        `);
    }
});

// POST /auth/instagram/callback
// Handle OAuth callback after user authorizes (React Native deep linking flow)
// Body: { code: string }
// Returns: { token, user }
router.post('/instagram/callback', async (req, res) => {
    try {
        console.log('🟢 [POST CALLBACK] Request received');
        console.log('🟢 [POST CALLBACK] Full body:', JSON.stringify(req.body, null, 2));
        console.log('🟢 [POST CALLBACK] Full headers:', JSON.stringify(req.headers, null, 2));
        
        const { code } = req.body;
        
        console.log('🟢 [POST CALLBACK] Extracted code:', code ? `${String(code).substring(0, 20)}...` : 'undefined');
        
        if (!code) {
            console.log('❌ [POST CALLBACK] No code found in request body');
        } else {
            console.log('✅ [POST CALLBACK] Code successfully extracted, passing to controller');
        }
        
        await authController.handleInstagramCallback(code, res);
    } catch (error: any) {
        console.error('❌ [POST CALLBACK] Exception caught:', error.message);
        res.status(500).json({
            success: false,
            error: 'CALLBACK_FAILED',
            message: error.message || 'Failed to process OAuth callback'
        });
    }
});

// POST /auth/refresh
// Refresh JWT token using a Refresh Token
// Body: { refreshToken: string }
router.post('/refresh', async (req, res) => {
    await authController.refreshToken(req, res);
});

// GET /auth/me
// Get current user information
// Requires: Authorization header with JWT
router.get('/me', authenticateJWT, async (req, res) => {
    await authController.getCurrentUser(req, res);
});

// POST /auth/logout
// Logout endpoint (mainly for client-side cleanup signal)
// Requires: Authorization header with JWT
router.post('/logout', authenticateJWT, (req, res) => {
    authController.logout(req, res);
});

export default router;
