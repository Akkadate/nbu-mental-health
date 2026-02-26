import { Request, Response, NextFunction } from 'express';
import type { Role } from '@nbu/shared';

/**
 * Role-based access control middleware.
 * Usage: router.get('/cases', authenticate, authorize('counselor', 'supervisor'), handler)
 */
export function authorize(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Role '${req.user.role}' is not authorized for this resource`,
            });
            return;
        }

        next();
    };
}
