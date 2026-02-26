import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * LINE webhook signature verification middleware.
 * Validates x-line-signature header using HMAC-SHA256 with Channel Secret.
 * Must use raw body (Buffer) for signature verification.
 */
export function verifyLineSignature(req: Request, res: Response, next: NextFunction): void {
    const signature = req.headers['x-line-signature'] as string;

    if (!signature) {
        logger.warn('LINE webhook: missing x-line-signature header');
        res.status(401).json({ error: 'Missing LINE signature' });
        return;
    }

    // req.body should be the raw Buffer when using express.raw() or custom middleware
    const body = (req as any).rawBody as Buffer;

    if (!body) {
        logger.error('LINE webhook: rawBody not available. Ensure raw body middleware is configured.');
        res.status(500).json({ error: 'Server configuration error' });
        return;
    }

    const expectedSignature = crypto
        .createHmac('SHA256', config.LINE_CHANNEL_SECRET)
        .update(body)
        .digest('base64');

    if (signature !== expectedSignature) {
        logger.warn('LINE webhook: invalid signature');
        res.status(401).json({ error: 'Invalid LINE signature' });
        return;
    }

    next();
}
