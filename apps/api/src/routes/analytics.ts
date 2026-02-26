import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

/**
 * GET /analytics/overview
 * Aggregate analytics — admin/supervisor only, NO student identifiers
 */
router.get('/overview',
    authenticate,
    authorize('admin', 'supervisor'),
    async (req: Request, res: Response) => {
        const { from, to } = req.query;

        if (!from || !to) {
            res.status(400).json({ error: 'Missing required query params: from, to' });
            return;
        }

        const metrics = await db('analytics.daily_metrics')
            .where('metric_date', '>=', from as string)
            .where('metric_date', '<=', to as string);

        // Aggregate totals
        const totals = metrics.reduce(
            (acc, m) => ({
                screenings:
                    acc.screenings + m.risk_low_count + m.risk_mod_count + m.risk_high_count + m.risk_crisis_count,
                risk_low: acc.risk_low + m.risk_low_count,
                risk_moderate: acc.risk_moderate + m.risk_mod_count,
                risk_high: acc.risk_high + m.risk_high_count,
                risk_crisis: acc.risk_crisis + m.risk_crisis_count,
                advisor_appointments: acc.advisor_appointments + m.advisor_appt_count,
                counselor_appointments: acc.counselor_appointments + m.counselor_appt_count,
            }),
            {
                screenings: 0,
                risk_low: 0,
                risk_moderate: 0,
                risk_high: 0,
                risk_crisis: 0,
                advisor_appointments: 0,
                counselor_appointments: 0,
            }
        );

        // Group by faculty
        const facultyMap = new Map<string, any>();
        for (const m of metrics) {
            const f = facultyMap.get(m.faculty) || {
                faculty: m.faculty,
                risk_low: 0,
                risk_moderate: 0,
                risk_high: 0,
                risk_crisis: 0,
            };
            f.risk_low += m.risk_low_count;
            f.risk_moderate += m.risk_mod_count;
            f.risk_high += m.risk_high_count;
            f.risk_crisis += m.risk_crisis_count;
            facultyMap.set(m.faculty, f);
        }

        res.json({
            period: { from, to },
            totals,
            by_faculty: Array.from(facultyMap.values()),
        });
    }
);

export default router;
