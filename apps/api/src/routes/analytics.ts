import { Router, Request, Response } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

/**
 * GET /analytics/overview
 * Aggregate analytics — admin/supervisor only, NO student identifiers
 * Defaults: last 30 days if from/to not provided
 */
router.get('/overview',
    authenticate,
    authorize('admin', 'supervisor'),
    async (req: Request, res: Response) => {
        // Default: last 30 days
        const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
        const fromDefault = new Date();
        fromDefault.setDate(fromDefault.getDate() - 30);
        const from = (req.query.from as string) || fromDefault.toISOString().split('T')[0];

        const metrics = await db('analytics.daily_metrics')
            .where('metric_date', '>=', from)
            .where('metric_date', '<=', to);

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

        // Count open cases (live from DB, not from aggregate)
        const [{ count: openCasesCount }] = await db('clinical.cases')
            .whereNotIn('status', ['closed'])
            .count('id as count');

        res.json({
            period: { from, to },
            totalScreenings: totals.screenings,
            riskLow: totals.risk_low,
            riskModerate: totals.risk_moderate,
            riskHigh: totals.risk_high,
            riskCrisis: totals.risk_crisis,
            advisorAppointments: totals.advisor_appointments,
            counselorAppointments: totals.counselor_appointments,
            openCases: Number(openCasesCount),
        });
    }
);

/**
 * GET /analytics/faculty-heatmap
 * Per-faculty risk breakdown — admin/supervisor only
 * Aggregates over last 30 days (or ?date= for a specific day)
 */
router.get('/faculty-heatmap',
    authenticate,
    authorize('admin', 'supervisor'),
    async (req: Request, res: Response) => {
        const date = req.query.date as string | undefined;

        let query = db('analytics.daily_metrics');
        if (date) {
            query = query.where('metric_date', date);
        } else {
            const fromDefault = new Date();
            fromDefault.setDate(fromDefault.getDate() - 30);
            query = query.where('metric_date', '>=', fromDefault.toISOString().split('T')[0]);
        }

        const rows = await query.select('faculty', 'risk_low_count', 'risk_mod_count', 'risk_high_count', 'risk_crisis_count');

        // Group by faculty and sum
        const facultyMap = new Map<string, { faculty: string; low: number; moderate: number; high: number; crisis: number }>();
        for (const m of rows) {
            const key = m.faculty ?? 'ไม่ระบุ';
            const existing = facultyMap.get(key) ?? { faculty: key, low: 0, moderate: 0, high: 0, crisis: 0 };
            existing.low += m.risk_low_count;
            existing.moderate += m.risk_mod_count;
            existing.high += m.risk_high_count;
            existing.crisis += m.risk_crisis_count;
            facultyMap.set(key, existing);
        }

        res.json(Array.from(facultyMap.values()));
    }
);

export default router;
