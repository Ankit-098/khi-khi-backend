/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Main JWT verification middleware
 * Apply to protected routes
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'NO_TOKEN',
                message: 'Access token is missing'
            });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
            id: string;
            email: string;
            role: string;
        };

        // Attach user info to request
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'TOKEN_EXPIRED',
                message: 'Access token has expired'
            });
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Invalid access token'
            });
            return;
        }

        res.status(403).json({
            success: false,
            error: 'AUTH_ERROR',
            message: 'Authentication failed'
        });
    }
};

/**
 * Optional JWT verification - doesn't fail if token is missing
 * Useful for endpoints that support both authenticated and unauthenticated access
 */
export const optionalJWT = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
                id: string;
                email: string;
                role: string;
            };
            req.user = decoded;
        }
    } catch (error) {
        // Skip auth if token is invalid, continue as unauthorized
    }
    next();
};

/**
 * Role-based access control middleware
 * Ensure user has required role
 */
export const authorize = (requiredRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'User not authenticated'
            });
            return;
        }

        if (!requiredRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: `User role '${req.user.role}' is not authorized for this resource`
            });
            return;
        }

        next();
    };
};

/**
 * Generate Access Token (Short-lived)
 */
export const generateAccessToken = (userId: string, email: string, role: string): string => {
    const payload = {
        id: userId,
        email,
        role
    };

    const secret = process.env.JWT_SECRET || 'secret';
    const options: any = {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' // default 1 hour
    };

    return jwt.sign(payload, secret, options);
};

/**
 * Generate Refresh Token (Long-lived)
 */
export const generateRefreshToken = (userId: string): string => {
    const payload = { id: userId };
    const secret = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_me';
    const options: any = {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' // default 30 days
    };

    return jwt.sign(payload, secret, options);
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): any => {
    try {
        const secret = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_me';
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

/**
 * LEGACY Support - Generate standard token
 */
export const generateToken = (userId: string, email: string, role: string): string => {
    return generateAccessToken(userId, email, role);
};
