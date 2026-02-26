import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { schemas } from '@nbu/shared';
import db from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

/**
 * POST /auth/login
 * Staff login with email + password → JWT
 */
router.post('/login', async (req: Request, res: Response) => {
    const parsed = schemas.LoginRequest.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
        return;
    }

    const { email, password } = parsed.data;

    const user = await db('public.users')
        .where({ email, is_active: true })
        .first();

    if (!user || !user.password_hash) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const token = jwt.sign(
        { sub: user.id, role: user.role, name: user.name ?? user.email, email: user.email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    res.json({
        token,
        user: {
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.name,
        },
    });
});

/**
 * GET /auth/me
 * Get current user info from JWT
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
    const user = await db('public.users')
        .where({ id: req.user!.id })
        .first();

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.json({
        id: user.id,
        role: user.role,
        email: user.email,
    });
});

/**
 * GET /auth/users
 * List all staff (advisor, counselor, admin) — admin only
 */
router.get('/users',
    authenticate,
    async (req: Request, res: Response) => {
        if (req.user!.role !== 'admin') {
            res.status(403).json({ error: 'Admin only' });
            return;
        }

        const users = await db('public.users')
            .whereIn('role', ['advisor', 'counselor', 'admin'])
            .orderBy('created_at', 'desc')
            .select('id', 'role', 'email', 'name', 'faculty', 'line_user_id', 'is_active', 'created_at');

        res.json(users);
    }
);

/**
 * POST /auth/users
 * Create a new staff account — admin only
 */
router.post('/users',
    authenticate,
    async (req: Request, res: Response) => {
        if (req.user!.role !== 'admin') {
            res.status(403).json({ error: 'Admin only' });
            return;
        }

        const { email, password, role, name, faculty } = req.body as {
            email?: string; password?: string; role?: string; name?: string; faculty?: string;
        };

        if (!email || !password || !role || !name) {
            res.status(400).json({ error: 'email, password, role, name are required' });
            return;
        }

        const validRoles = ['advisor', 'counselor', 'admin'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ error: 'Invalid role' });
            return;
        }

        const existing = await db('public.users').where({ email }).first();
        if (existing) {
            res.status(409).json({ error: 'Email already in use' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 12);

        const [created] = await db('public.users')
            .insert({ email, password_hash, role, name, faculty: faculty ?? null, is_active: true })
            .returning(['id', 'role', 'email', 'name', 'faculty', 'is_active', 'created_at']);

        res.status(201).json(created);
    }
);

/**
 * PATCH /auth/users/:id
 * Update staff account fields (name, faculty) — admin only
 */
router.patch('/users/:id',
    authenticate,
    async (req: Request, res: Response) => {
        if (req.user!.role !== 'admin') {
            res.status(403).json({ error: 'Admin only' });
            return;
        }

        const { id } = req.params;
        const { name, faculty } = req.body as { name?: string; faculty?: string };

        if (!name && faculty === undefined) {
            res.status(400).json({ error: 'Nothing to update' });
            return;
        }

        const updates: Record<string, unknown> = {};
        if (name) updates.name = name.trim();
        if (faculty !== undefined) updates.faculty = faculty.trim() || null;

        const [updated] = await db('public.users')
            .where({ id })
            .update(updates)
            .returning(['id', 'role', 'email', 'name', 'faculty', 'line_user_id', 'is_active', 'created_at']);

        if (!updated) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(updated);
    }
);

/**
 * POST /auth/link-line-staff
 * Link LINE account to staff user via LIFF.
 * Staff opens LIFF /link-staff, enters email+password.
 * LIFF sends LINE access token → backend verifies → stores line_user_id.
 */
router.post('/link-line-staff', async (req: Request, res: Response) => {
    const { line_access_token, email, password } = req.body as {
        line_access_token?: string;
        email?: string;
        password?: string;
    };

    if (!line_access_token || !email || !password) {
        res.status(400).json({ error: 'line_access_token, email, and password are required' });
        return;
    }

    // Verify LINE access token → get LINE userId via /v2/profile
    let lineUserId: string;
    try {
        const profileRes = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${line_access_token}` },
        });
        if (!profileRes.ok) {
            const errData = await profileRes.json().catch(() => ({}));
            logger.warn({ status: profileRes.status, errData }, 'LINE profile fetch failed');
            res.status(401).json({ error: 'Invalid LINE access token' });
            return;
        }
        const profileData = await profileRes.json() as { userId?: string };
        if (!profileData.userId) {
            logger.warn({ profileData }, 'LINE profile response missing userId');
            res.status(401).json({ error: 'Cannot verify LINE identity' });
            return;
        }
        lineUserId = profileData.userId;
    } catch (err) {
        logger.error({ err }, 'LINE profile service error');
        res.status(502).json({ error: 'LINE verification service unavailable' });
        return;
    }

    // Verify staff credentials
    const user = await db('public.users')
        .where({ email, is_active: true })
        .whereIn('role', ['advisor', 'counselor', 'admin', 'supervisor'])
        .first();

    if (!user || !user.password_hash) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    // Check LINE userId not already linked to another account
    const existing = await db('public.users')
        .where({ line_user_id: lineUserId })
        .whereNot({ id: user.id })
        .first();
    if (existing) {
        res.status(409).json({ error: 'LINE account already linked to another staff account' });
        return;
    }

    // Store LINE userId
    await db('public.users')
        .where({ id: user.id })
        .update({ line_user_id: lineUserId });

    res.json({ ok: true, message: 'LINE account linked successfully' });
});

/**
 * DELETE /auth/users/:id
 * Deactivate staff account — admin only (soft delete)
 */
router.delete('/users/:id',
    authenticate,
    async (req: Request, res: Response) => {
        if (req.user!.role !== 'admin') {
            res.status(403).json({ error: 'Admin only' });
            return;
        }

        const { id } = req.params;

        if (id === req.user!.id) {
            res.status(400).json({ error: 'Cannot deactivate your own account' });
            return;
        }

        const [updated] = await db('public.users')
            .where({ id })
            .update({ is_active: false })
            .returning('id');

        if (!updated) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(204).send();
    }
);

export default router;
