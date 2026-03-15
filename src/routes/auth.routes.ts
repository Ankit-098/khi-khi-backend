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
        console.log('🔵 [GET CALLBACK] Request received');
        console.log('🔵 [GET CALLBACK] Full query params:', JSON.stringify(req.query, null, 2));
        
        const { code, error, error_description } = req.query;
        
        console.log('🔵 [GET CALLBACK] Extracted code:', code ? `${String(code).substring(0, 20)}...` : 'undefined');
        console.log('🔵 [GET CALLBACK] Extracted error:', error);

        // Handle Instagram errors
        if (error) {
            console.log('❌ [GET CALLBACK] Instagram returned error:', error);
            res.setHeader('Content-Type', 'text/html');
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Authorization Failed</title>
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
                        .message { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Authorization Failed</h1>
                        <p class="message">${error_description || error}</p>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                    </div>
                </body>
                </html>
            `);
        }

        // Check for missing code
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

        // Process callback and get auth data (without sending response)
        const authData = await authController.processInstagramCallback(code as string);

        // Send success HTML with code
        console.log('📄 [GET CALLBACK] Returning HTML success page for Expo development');
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
                            <li>Click "🐛 Expo Dev Mode" toggle to enable it</li>
                            <li>Paste the code in the authorization code field</li>
                            <li>Click "✓ Exchange Code"</li>
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

// GET /auth/refresh
// Refresh JWT token
// Requires: Authorization header with JWT
router.get('/refresh', authenticateJWT, async (req, res) => {
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
