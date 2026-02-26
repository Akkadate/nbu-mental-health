import { Router, Request, Response } from 'express';
import { schemas } from '@nbu/shared';
import db from '../db.js';
import { authenticate, authorize, auditLog } from '../middleware/index.js';
import { createReminderJobs } from '../services/jobs.js';
import { logger } from '../logger.js';

const router = Router();

/**
 * POST /appointments
 * Book an appointment (advisor or counselor) — called from LIFF
 */
router.post('/', async (req: Request, res: Response) => {
    const parsed = schemas.CreateAppointmentRequest.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
        return;
    }

    const { student_id, type, slot_id, mode } = parsed.data;

    // Determine schema (advisory or clinical)
    const slotTable = type === 'advisor' ? 'advisory.slots' : 'clinical.slots';
    const apptTable = type === 'advisor' ? 'advisory.appointments' : 'clinical.appointments';
    const staffIdField = type === 'advisor' ? 'advisor_id' : 'counselor_id';

    // Find and lock the slot
    const slot = await db(slotTable)
        .where({ id: slot_id, is_available: true })
        .first();

    if (!slot) {
        res.status(409).json({ error: 'ช่วงเวลานี้ไม่ว่างแล้ว กรุณาเลือกช่วงเวลาอื่น' });
        return;
    }

    // Mark slot as unavailable
    await db(slotTable).where({ id: slot_id }).update({ is_available: false });

    // Create appointment
    const staffId = type === 'advisor' ? slot.advisor_id : slot.counselor_id;

    const [appointment] = await db(apptTable)
        .insert({
            student_id,
            [staffIdField]: staffId,
            scheduled_at: slot.start_at,
            mode,
            status: 'scheduled',
        })
        .returning('*');

    // Create reminder jobs
    const lineLink = await db('public.line_links')
        .where({ student_id })
        .first();

    if (lineLink) {
        await createReminderJobs(
            appointment.id,
            lineLink.line_user_id,
            new Date(slot.start_at)
        );
    }

    logger.info({
        appointmentId: appointment.id,
        type,
        studentId: student_id,
    }, 'Appointment booked');

    res.status(201).json({
        id: appointment.id,
        student_id: appointment.student_id,
        type,
        scheduled_at: appointment.scheduled_at,
        mode: appointment.mode,
        status: appointment.status,
    });
});

/**
 * GET /appointments/slots
 * Get available slots — query: type=advisor|counselor, from, to
 */
router.get('/slots', async (req: Request, res: Response) => {
    const { type, from, to } = req.query;

    if (!type || !from || !to) {
        res.status(400).json({ error: 'Missing required query params: type, from, to' });
        return;
    }

    const table = type === 'advisor' ? 'advisory.slots' : 'clinical.slots';

    const slots = await db(table)
        .where('is_available', true)
        .where('start_at', '>=', from as string)
        .where('end_at', '<=', to as string)
        .orderBy('start_at', 'asc');

    res.json(slots);
});

/**
 * PATCH /appointments/:id
 * Update appointment status — staff only
 */
router.patch('/:id',
    authenticate,
    authorize('advisor', 'counselor', 'admin'),
    auditLog('update_appointment'),
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` });
            return;
        }

        // Try advisory first, then clinical
        let updated = await db('advisory.appointments')
            .where({ id })
            .update({ status })
            .returning('*');

        if (updated.length === 0) {
            updated = await db('clinical.appointments')
                .where({ id })
                .update({ status })
                .returning('*');
        }

        if (updated.length === 0) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }

        // If cancelled, free up the slot
        if (status === 'cancelled') {
            const appt = updated[0];
            const table = appt.advisor_id ? 'advisory.slots' : 'clinical.slots';
            await db(table)
                .where('start_at', appt.scheduled_at)
                .update({ is_available: true });
        }

        res.json(updated[0]);
    }
);

export default router;
