import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Logger Middleware
 * 1. Generates a unique Trace ID for every request
 * 2. Tracks execution time for the request
 * 3. Logs request/response details in a structured format
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Generate unique trace ID
    const traceId = randomUUID();
    
    // Capture start time
    const start = process.hrtime();
    
    // Attach trace ID to the response headers for debugging
    res.setHeader('X-Trace-ID', traceId);
    
    // Log request start
    console.log(`[${new Date().toISOString()}] [REQUEST] [${traceId}] ${req.method} ${req.originalUrl}`);

    // Capture response finish
    res.on('finish', () => {
        // Calculate duration
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
        
        // Attach response time to header (though it's already sent, this is for internal state if needed)
        // Note: Headers cannot be set after finish, so this is just for logging
        
        // Log request completion
        const status = res.statusCode;
        const logType = status >= 400 ? 'ERROR' : 'SUCCESS';
        
        console.log(
            `[${new Date().toISOString()}] [RESPONSE] [${traceId}] ${req.method} ${req.originalUrl} ` +
            `STATUS: ${status} TIME: ${timeInMs}ms`
        );
        
        // For debugging on the frontend, we can also set the header BEFORE finish if we override the end method
        // but X-Response-Time usually refers to how long it took the server to process.
    });

    next();
};
