import { Router, Request, Response } from 'express';
import { schemas } from '@nbu/shared';
import db from '../db.js';
import { authenticate, authorize, auditLog } from '../middleware/index.js';
import { encryptNote, decryptNote } from '../services/encryption.js';

const router = Router();

/**
 * GET /clinical/cases
 * List clinical cases — counselor/supervisor only
 */
router.get('/cases',
    authenticate,
    authorize('counselor', 'supervisor'),
    auditLog('view_cases'),
    async (req: Request, res: Response) => {
        const { status, priority } = req.query;

        let query = db('clinical.cases')
            .join('public.students', 'clinical.cases.student_id', 'public.students.id')
            .select(
                'clinical.cases.*',
                'public.students.student_code',
                'public.students.faculty'
            );

        if (status) query = query.where('clinical.cases.status', status as string);
        if (priority) query = query.where('clinical.cases.priority', priority as string);

        const cases = await query.orderBy('clinical.cases.created_at', 'desc');
        res.json(cases);
    }
);

/**
 * GET /clinical/cases/:id
 * Get case detail with screening — counselor/supervisor only
 */
router.get('/cases/:id',
    authenticate,
    authorize('counselor', 'supervisor'),
    auditLog('view_case_detail'),
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const caseData = await db('clinical.cases')
            .where('clinical.cases.id', id)
            .join('public.students', 'clinical.cases.student_id', 'public.students.id')
            .select(
                'clinical.cases.*',
                'public.students.student_code',
                'public.students.faculty',
                'public.students.year'
            )
            .first();

        if (!caseData) {
            res.status(404).json({ error: 'Case not found' });
            return;
        }

        // Get related screening
        let screening = null;
        if (caseData.latest_screening_id) {
            screening = await db('clinical.screenings')
                .where({ id: caseData.latest_screening_id })
                .first();
        }

        // Get case notes (decrypted)
        const notesRaw = await db('clinical.case_notes')
            .where({ case_id: id })
            .orderBy('created_at', 'desc');

        const notes = notesRaw.map((n: any) => ({
            id: n.id,
            counselor_id: n.counselor_id,
            note: decryptNote(n.encrypted_note),
            created_at: n.created_at,
        }));

        res.json({
            ...caseData,
            screening,
            notes,
        });
    }
);

/**
 * POST /clinical/cases/:id/ack
 * Acknowledge a case — counselor only
 */
router.post('/cases/:id/ack',
    authenticate,
    authorize('counselor'),
    auditLog('ack_case'),
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const counselor = await db('clinical.counselors')
            .where({ user_id: req.user!.id })
            .first();

        if (!counselor) {
            res.status(403).json({ error: 'Not registered as counselor' });
            return;
        }

        const [updated] = await db('clinical.cases')
            .where({ id, status: 'open' })
            .update({
                status: 'acked',
                assigned_counselor_id: counselor.id,
                acked_at: new Date(),
            })
            .returning('*');

        if (!updated) {
            res.status(404).json({ error: 'Case not found or already acknowledged' });
            return;
        }

        res.json(updated);
    }
);

/**
 * POST /clinical/case-notes
 * Add encrypted case note — counselor only
 */
router.post('/case-notes',
    authenticate,
    authorize('counselor'),
    auditLog('create_case_note'),
    async (req: Request, res: Response) => {
        const parsed = schemas.CreateCaseNoteRequest.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
            return;
        }

        const { case_id, note } = parsed.data;

        const counselor = await db('clinical.counselors')
            .where({ user_id: req.user!.id })
            .first();

        if (!counselor) {
            res.status(403).json({ error: 'Not registered as counselor' });
            return;
        }

        // Verify case exists
        const caseRecord = await db('clinical.cases').where({ id: case_id }).first();
        if (!caseRecord) {
            res.status(404).json({ error: 'Case not found' });
            return;
        }

        // Encrypt and store
        const encryptedNote = encryptNote(note);

        const [created] = await db('clinical.case_notes')
            .insert({
                case_id,
                counselor_id: counselor.id,
                encrypted_note: encryptedNote,
            })
            .returning('*');

        res.status(201).json({
            id: created.id,
            case_id: created.case_id,
            counselor_id: created.counselor_id,
            created_at: created.created_at,
        });
    }
);

/**
 * GET /clinical/appointments
 * List counselor appointments
 */
router.get('/appointments',
    authenticate,
    authorize('counselor', 'supervisor'),
    async (req: Request, res: Response) => {
        const { from, to, status } = req.query;

        let query = db('clinical.appointments')
            .join('public.students', 'clinical.appointments.student_id', 'public.students.id')
            .select(
                'clinical.appointments.*',
                'public.students.student_code',
                'public.students.faculty'
            );

        if (from) query = query.where('scheduled_at', '>=', from as string);
        if (to) query = query.where('scheduled_at', '<=', to as string);
        if (status) query = query.where('clinical.appointments.status', status as string);

        const appointments = await query.orderBy('scheduled_at', 'asc');
        res.json(appointments);
    }
);

/**
 * POST /clinical/slots
 * Create counselor slot
 */
router.post('/slots',
    authenticate,
    authorize('counselor'),
    async (req: Request, res: Response) => {
        const parsed = schemas.CreateSlotRequest.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
            return;
        }

        const counselor = await db('clinical.counselors')
            .where({ user_id: req.user!.id })
            .first();

        if (!counselor) {
            res.status(403).json({ error: 'Not registered as counselor' });
            return;
        }

        const [slot] = await db('clinical.slots')
            .insert({
                counselor_id: counselor.id,
                start_at: parsed.data.start_at,
                end_at: parsed.data.end_at,
                is_available: true,
            })
            .returning('*');

        res.status(201).json(slot);
    }
);

/**
 * GET /clinical/slots
 * List counselor slots
 */
router.get('/slots',
    async (req: Request, res: Response) => {
        const { from, to } = req.query;

        let query = db('clinical.slots').where('is_available', true);
        if (from) query = query.where('start_at', '>=', from as string);
        if (to) query = query.where('end_at', '<=', to as string);

        const slots = await query.orderBy('start_at', 'asc');
        res.json(slots);
    }
);

/**
 * DELETE /clinical/slots/:id
 * Delete counselor slot — counselor role only
 */
router.delete('/slots/:id',
    authenticate,
    authorize('counselor'),
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const counselor = await db('clinical.counselors')
            .where({ user_id: req.user!.id })
            .first();

        if (!counselor) {
            res.status(403).json({ error: 'Not registered as counselor' });
            return;
        }

        const deleted = await db('clinical.slots')
            .where({ id, counselor_id: counselor.id })
            .delete();

        if (!deleted) {
            res.status(404).json({ error: 'Slot not found or not owned by you' });
            return;
        }

        res.status(204).send();
    }
);

/**
 * PATCH /clinical/appointments/:id
 * Update clinical appointment status — counselor only
 */
router.patch('/appointments/:id',
    authenticate,
    authorize('counselor', 'supervisor'),
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status } = req.body as { status?: string };

        const allowed = ['scheduled', 'completed', 'cancelled', 'no_show'];
        if (!status || !allowed.includes(status)) {
            res.status(400).json({ error: 'Invalid status value' });
            return;
        }

        const [updated] = await db('clinical.appointments')
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
