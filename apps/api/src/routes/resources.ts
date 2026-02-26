import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

/**
 * GET /resources
 * Public: list active resources (used by LINE bot)
 */
router.get('/', async (req: Request, res: Response) => {
    const { category } = req.query;

    let query = db('public.resources');
    if (category) query = query.where({ category });
    // When called from admin (authenticated), show all; otherwise only active
    const isAdmin = req.headers.authorization;
    if (!isAdmin) query = query.where({ is_active: true });

    const resources = await query.orderBy('created_at', 'desc');
    res.json(resources);
});

/**
 * POST /resources
 * Admin only: create resource
 */
router.post('/',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { category, title, url, content_markdown, tags } = req.body as {
            category?: string;
            title?: string;
            url?: string;
            content_markdown?: string;
            tags?: string[];
        };

        if (!category || !title) {
            res.status(400).json({ error: 'category and title are required' });
            return;
        }

        const [created] = await db('public.resources')
            .insert({
                category,
                title,
                url: url ?? null,
                content_markdown: content_markdown ?? null,
                tags: tags ?? [],
                is_active: true,
            })
            .returning('*');

        res.status(201).json(created);
    }
);

/**
 * PATCH /resources/:id
 * Admin only: update resource
 */
router.patch('/:id',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { category, title, url, content_markdown, tags, is_active } = req.body;

        const [updated] = await db('public.resources')
            .where({ id })
            .update({
                ...(category !== undefined && { category }),
                ...(title !== undefined && { title }),
                ...(url !== undefined && { url }),
                ...(content_markdown !== undefined && { content_markdown }),
                ...(tags !== undefined && { tags }),
                ...(is_active !== undefined && { is_active }),
                updated_at: new Date(),
            })
            .returning('*');

        if (!updated) {
            res.status(404).json({ error: 'Resource not found' });
            return;
        }

        res.json(updated);
    }
);

/**
 * DELETE /resources/:id
 * Admin only: delete resource
 */
router.delete('/:id',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const deleted = await db('public.resources').where({ id }).delete();

        if (!deleted) {
            res.status(404).json({ error: 'Resource not found' });
            return;
        }

        res.status(204).send();
    }
);

export default router;
