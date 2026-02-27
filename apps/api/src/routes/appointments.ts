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
 * Auth via line_user_id (resolved to student_id server-side)
 */
router.post('/', async (req: Request, res: Response) => {
    const parsed = schemas.LiffAppointmentRequest.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
        return;
    }

    const { line_user_id, type, slot_id, mode } = parsed.data;

    // Resolve line_user_id → student_id
    const lineLink = await db('public.line_links').where({ line_user_id }).first();
    if (!lineLink) {
        res.status(403).json({ error: 'LINE account not linked. Please verify your student ID first.' });
        return;
    }
    const student_id = lineLink.student_id;

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

    // Create reminder jobs (lineLink already resolved above)
    await createReminderJobs(
        appointment.id,
        line_user_id,
        new Date(slot.start_at)
    );

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
 * Get available slots — called from LIFF
 * Query: type=advisor|counselor (required), from? (default: now), to? (default: +30d), limit? (default: 30)
 */
router.get('/slots', async (req: Request, res: Response) => {
    const { type, from, to, limit } = req.query;

    if (!type || (type !== 'advisor' && type !== 'counselor')) {
        res.status(400).json({ error: 'Missing or invalid query param: type (advisor|counselor)' });
        return;
    }

    const fromDate = (from as string) || new Date().toISOString();
    const toDate = (to as string) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const rowLimit = Math.min(Number(limit) || 30, 100);

    const table = type === 'advisor' ? 'advisory.slots' : 'clinical.slots';

    const slots = await db(table)
        .where('is_available', true)
        .where('start_at', '>=', fromDate)
        .where('start_at', '<', toDate)
        .orderBy('start_at', 'asc')
        .limit(rowLimit);

    // Transform to LIFF-expected format (date + start_time + end_time strings in Bangkok timezone)
    const data = slots.map((s: any) => {
        const start = new Date(s.start_at);
        const end = new Date(s.end_at);
        return {
            id: s.id,
            date: start.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }), // "YYYY-MM-DD"
            start_time: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }), // "HH:MM"
            end_time: end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }),
            available: s.is_available,
        };
    });

    res.json({ data, count: data.length });
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
