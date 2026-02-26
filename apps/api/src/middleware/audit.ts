import { Request, Response, NextFunction } from 'express';
import db from '../db.js';
import { logger } from '../logger.js';

/**
 * Audit logging middleware factory.
 * Records sensitive actions to public.audit_log.
 */
export function auditLog(action: string) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                next();
                return;
            }

            const objectType = req.baseUrl.split('/').filter(Boolean).pop() || 'unknown';
            const objectId = req.params.id || null;

            await db('public.audit_log').insert({
                actor_user_id: req.user.id,
                actor_role: req.user.role,
                action,
                object_type: objectType,
                object_id: objectId,
                ip: req.ip || req.socket.remoteAddress,
                user_agent: req.headers['user-agent'] || null,
            });
        } catch (err) {
            // Audit log failure should not block the request
            logger.error({ err, action }, 'Failed to write audit log');
        }

        next();
    };
}
