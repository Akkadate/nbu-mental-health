import { Router, Request, Response } from 'express';
import { schemas, RiskLevel } from '@nbu/shared';
import db from '../db.js';
import { calculateRisk, getRoutingSuggestion } from '../services/risk-engine.js';
import { createJob, createEscalationJob, createNotifyStaffJob, createScreeningResultJob } from '../services/jobs.js';
import { logger } from '../logger.js';

const router = Router();

/**
 * POST /screenings
 * Submit screening answers → calculate risk → create case if HIGH/CRISIS
 * Called from LIFF app: auth via line_user_id (resolved to student_id server-side)
 */
router.post('/', async (req: Request, res: Response) => {
    const parsed = schemas.LiffScreeningRequest.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
        return;
    }

    const { line_user_id, type, intent, answers } = parsed.data;

    // Resolve line_user_id → student_id
    const lineLink = await db('public.line_links').where({ line_user_id }).first();
    if (!lineLink) {
        res.status(403).json({ error: 'LINE account not linked. Please verify your student ID first.' });
        return;
    }
    const student_id = lineLink.student_id;

    // Verify student exists
    const student = await db('public.students').where({ id: student_id }).first();
    if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
    }

    // Convert LIFF answers array → Record<string, number[]> for risk engine
    // PHQ-9 question IDs 1–9, GAD-7 question IDs 10–16 (if present)
    const sortedAnswers = [...answers].sort((a, b) => a.question_id - b.question_id);
    const normalizedAnswers: Record<string, number[]> =
        type === 'phq9_gad7'
            ? {
                  phq9: sortedAnswers.filter((a) => a.question_id <= 9).map((a) => a.score),
                  gad7: sortedAnswers.filter((a) => a.question_id >= 10 && a.question_id <= 16).map((a) => a.score),
              }
            : { stress: sortedAnswers.map((a) => a.score) };

    // Calculate risk
    const scores = calculateRisk(type, normalizedAnswers);
    const suggestion = getRoutingSuggestion(scores.risk_level, intent);

    // Insert screening record
    const [screening] = await db('clinical.screenings')
        .insert({
            student_id,
            type,
            answers_json: JSON.stringify(answers),
            phq9_score: scores.phq9_score,
            gad7_score: scores.gad7_score,
            stress_score: scores.stress_score,
            risk_level: scores.risk_level,
        })
        .returning('*');

    let caseId: string | null = null;

    // Create case for HIGH and CRISIS
    if (scores.risk_level === RiskLevel.HIGH || scores.risk_level === RiskLevel.CRISIS) {
        const [newCase] = await db('clinical.cases')
            .insert({
                student_id,
                latest_screening_id: screening.id,
                priority: scores.risk_level === RiskLevel.CRISIS ? 'crisis' : 'high',
                status: 'open',
            })
            .returning('*');

        caseId = newCase.id;

        // Notify counselors via LINE Messaging API (job queue)
        // Staff LINE userId is stored directly in public.users.line_user_id
        const counselors = await db('clinical.counselors')
            .join('public.users', 'clinical.counselors.user_id', 'public.users.id')
            .whereNotNull('public.users.line_user_id')
            .where('public.users.is_active', true)
            .select('public.users.line_user_id');

        const counselorLineIds = counselors.map((c: any) => c.line_user_id).filter(Boolean);

        if (counselorLineIds.length > 0) {
            await createNotifyStaffJob(counselorLineIds, newCase.id, newCase.priority);
        }

        // Crisis: escalation check after 30 minutes
        if (scores.risk_level === RiskLevel.CRISIS) {
            await createEscalationJob(newCase.id);
        }

        logger.info({ caseId: newCase.id, priority: newCase.priority }, 'Clinical case created');
    }

    // Create aggregate metrics job
    await createJob('aggregate_rollup', {
        screening_id: screening.id,
        faculty: student.faculty,
        risk_level: scores.risk_level,
        date: new Date().toISOString().split('T')[0],
    });

    // Push screening result back to student via LINE (lineLink already resolved above)
    await createScreeningResultJob(
        line_user_id,
        scores.risk_level,
        suggestion,
    );

    logger.info({
        screeningId: screening.id,
        studentId: student_id,
        riskLevel: scores.risk_level,
    }, 'Screening completed');

    res.status(201).json({
        id: screening.id,
        risk_level: scores.risk_level,
        phq9_score: scores.phq9_score,
        gad7_score: scores.gad7_score,
        stress_score: scores.stress_score,
        routing_suggestion: suggestion,
        case_id: caseId,
    });
});

/**
 * GET /screenings/latest/:studentId
 * Get most recent screening for a student (used by Soft Gate)
 */
router.get('/latest/:studentId', async (req: Request, res: Response) => {
    const { studentId } = req.params;

    const screening = await db('clinical.screenings')
        .where({ student_id: studentId })
        .orderBy('created_at', 'desc')
        .first();

    if (!screening) {
        res.json({ has_recent: false, screening: null });
        return;
    }

    // Check if within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const isRecent = new Date(screening.created_at) > thirtyDaysAgo;

    res.json({
        has_recent: isRecent,
        screening: isRecent ? {
            id: screening.id,
            risk_level: screening.risk_level,
            created_at: screening.created_at,
        } : null,
    });
});

export default router;
