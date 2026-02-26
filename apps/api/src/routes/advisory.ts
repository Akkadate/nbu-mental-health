import { Router, Request, Response } from 'express';
import { schemas } from '@nbu/shared';
import db from '../db.js';
import { authenticate, authorize, auditLog } from '../middleware/index.js';

const router = Router();

/**
 * GET /advisory/appointments
 * List advisor appointments — advisor+ role
 */
router.get('/appointments',
    authenticate,
    authorize('advisor', 'admin'),
    async (req: Request, res: Response) => {
        const { from, to, status } = req.query;

        let query = db('advisory.appointments')
            .join('public.students', 'advisory.appointments.student_id', 'public.students.id')
            .select(
                'advisory.appointments.*',
                'public.students.student_code',
                'public.students.faculty'
            );

        if (from) query = query.where('scheduled_at', '>=', from as string);
        if (to) query = query.where('scheduled_at', '<=', to as string);
        if (status) query = query.where('advisory.appointments.status', status as string);

        const appointments = await query.orderBy('scheduled_at', 'asc');
        res.json(appointments);
    }
);

/**
 * POST /advisory/slots
 * Create advisor slots — advisor role
 */
router.post('/slots',
    authenticate,
    authorize('advisor'),
    async (req: Request, res: Response) => {
        const parsed = schemas.CreateSlotRequest.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
            return;
        }

        // Find advisor by user_id
        const advisor = await db('advisory.advisors')
            .where({ user_id: req.user!.id })
            .first();

        if (!advisor) {
            res.status(403).json({ error: 'Not registered as advisor' });
            return;
        }

        const [slot] = await db('advisory.slots')
            .insert({
                advisor_id: advisor.id,
                start_at: parsed.data.start_at,
                end_at: parsed.data.end_at,
                is_available: true,
            })
            .returning('*');

        res.status(201).json(slot);
    }
);

/**
 * GET /advisory/slots
 * List advisor slots
 */
router.get('/slots',
    async (req: Request, res: Response) => {
        const { from, to } = req.query;

        let query = db('advisory.slots').where('is_available', true);
        if (from) query = query.where('start_at', '>=', from as string);
        if (to) query = query.where('end_at', '<=', to as string);

        const slots = await query.orderBy('start_at', 'asc');
        res.json(slots);
    }
);

/**
 * DELETE /advisory/slots/:id
 * Delete advisor slot — advisor role only
 */
router.delete('/slots/:id',
    authenticate,
    authorize('advisor'),
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const advisor = await db('advisory.advisors')
            .where({ user_id: req.user!.id })
            .first();

        if (!advisor) {
            res.status(403).json({ error: 'Not registered as advisor' });
            return;
        }

        const deleted = await db('advisory.slots')
            .where({ id, advisor_id: advisor.id })
            .delete();

        if (!deleted) {
            res.status(404).json({ error: 'Slot not found or not owned by you' });
            return;
        }

        res.status(204).send();
    }
);

/**
 * PATCH /advisory/appointments/:id
 * Update appointment status — advisor role
 */
router.patch('/appointments/:id',
    authenticate,
    authorize('advisor', 'admin'),
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status } = req.body as { status?: string };

        const allowed = ['scheduled', 'completed', 'cancelled', 'no_show'];
        if (!status || !allowed.includes(status)) {
            res.status(400).json({ error: 'Invalid status value' });
            return;
        }

        const [updated] = await db('advisory.appointments')
            .where({ id })
            .update({ status, updated_at: new Date() })
            .returning('*');

        if (!updated) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }

        res.json(updated);
    }
);

export default router;
