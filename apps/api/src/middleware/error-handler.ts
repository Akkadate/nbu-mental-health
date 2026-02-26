import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';

/**
 * Global error handler.
 * Catches unhandled errors, formats Zod validation errors, and returns JSON responses.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    // Zod validation error
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation Error',
            details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // Known operational errors
    if ('statusCode' in err && typeof (err as any).statusCode === 'number') {
        const statusCode = (err as any).statusCode;
        res.status(statusCode).json({
            error: err.message,
        });
        return;
    }

    // Unknown errors
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

    res.status(500).json({
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
    });
}

/**
 * Helper to create operational errors with status codes.
 */
export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
