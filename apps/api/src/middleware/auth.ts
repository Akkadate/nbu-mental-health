import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { JwtPayload } from '@nbu/shared';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: string };
        }
    }
}

/**
 * JWT authentication middleware.
 * Extracts and verifies Bearer token from Authorization header.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.slice(7);

    try {
        const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch (err) {
        logger.warn({ err }, 'JWT verification failed');
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
