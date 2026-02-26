import { Router, Request, Response } from 'express';
import { schemas } from '@nbu/shared';
import db from '../db.js';
import { hashSensitiveData } from '../services/encryption.js';
import { assignVerifiedMenu } from '../services/line-client.js';
import { logger } from '../logger.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

// Rate limit tracking (in-memory for MVP, upgrade to Redis later)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    entry.count++;
    return true;
}

/**
 * POST /students/link-line
 * LIFF Verify → Link student_code to LINE userId
 * Dual-document verification: National ID/Pink Card OR Passport
 */
router.post('/link-line', async (req: Request, res: Response) => {
    const parsed = schemas.LinkLineRequest.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
        return;
    }

    const { student_code, verify_doc_type, verify_token, verify_doc_number, line_user_id } = parsed.data;

    // Rate limit per line_user_id
    if (!checkRateLimit(line_user_id)) {
        res.status(429).json({ error: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' });
        return;
    }

    // Check if already linked
    const existingLink = await db('public.line_links')
        .where({ line_user_id })
        .first();

    if (existingLink) {
        res.status(409).json({ error: 'LINE account นี้เชื่อมต่อแล้ว' });
        return;
    }

    // Find student
    const student = await db('public.students')
        .where({ student_code, status: 'active' })
        .first();

    if (!student) {
        // Generic error to prevent enumeration
        logger.warn({ student_code, line_user_id }, 'Link attempt: student not found');
        res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
        return;
    }

    // Verify DOB (verify_token = YYYY-MM-DD)
    const dobHash = hashSensitiveData(verify_token);
    if (student.dob_hash && student.dob_hash !== dobHash) {
        logger.warn({ student_code, line_user_id }, 'Link attempt: DOB mismatch');
        await logAudit(line_user_id, 'link_line_failed', 'student', student.id);
        res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
        return;
    }

    // Verify document number
    const docHash = hashSensitiveData(verify_doc_number);
    const docField = verify_doc_type === 'national_id' ? 'id_card_hash' : 'passport_hash';

    if (student[docField] && student[docField] !== docHash) {
        logger.warn({ student_code, line_user_id, verify_doc_type }, 'Link attempt: doc mismatch');
        await logAudit(line_user_id, 'link_line_failed', 'student', student.id);
        res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
        return;
    }

    // Create link
    await db('public.line_links').insert({
        student_id: student.id,
        line_user_id,
        consent_version: 'v1',
        consented_at: new Date(),
    });

    // Update student verify_doc_type if not set
    if (!student.verify_doc_type) {
        await db('public.students')
            .where({ id: student.id })
            .update({ verify_doc_type });
    }

    // Switch Rich Menu to Verified
    try {
        await assignVerifiedMenu(line_user_id);
    } catch (err) {
        logger.error({ err, line_user_id }, 'Failed to assign verified menu (non-blocking)');
    }

    // Audit log
    await logAudit(line_user_id, 'link_line_success', 'student', student.id);

    logger.info({ student_code, line_user_id }, 'Student linked successfully');

    res.json({
        linked: true,
        student_id: student.id,
    });
});

/**
 * GET /students
 * รายชื่อนักศึกษาทั้งหมด — admin only
 * ไม่แสดง hash fields
 */
router.get('/',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { search, faculty, linked, page = '1', limit = '50' } = req.query;

        // Base filter (ใช้ร่วมกันระหว่าง count และ data query)
        const applyFilters = (q: ReturnType<typeof db>) => {
            if (search) q = q.where('s.student_code', 'ilike', `%${search}%`);
            if (faculty) q = q.where('s.faculty', faculty as string);
            if (linked === 'yes') q = q.whereNotNull('l.line_user_id');
            else if (linked === 'no') q = q.whereNull('l.line_user_id');
            return q;
        };

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
        const offset = (pageNum - 1) * limitNum;

        // Data query
        const dataQuery = applyFilters(
            db('public.students as s')
                .leftJoin('public.line_links as l', 'l.student_id', 's.id')
                .select('s.id', 's.student_code', 's.faculty', 's.year', 's.status', 's.created_at',
                    db.raw('l.line_user_id'), db.raw('l.linked_at'))
        ).orderBy('s.student_code').limit(limitNum).offset(offset);

        // Count query — แยกออกจาก data query ไม่ให้ติด select columns
        const countQuery = applyFilters(
            db('public.students as s')
                .leftJoin('public.line_links as l', 'l.student_id', 's.id')
                .count('s.id as count')
        );

        const [rows, [{ count }]] = await Promise.all([dataQuery, countQuery]);

        res.json({
            data: rows,
            total: parseInt(count as string, 10),
            page: pageNum,
            limit: limitNum,
        });
    }
);

/**
 * GET /students/faculties
 * รายชื่อคณะทั้งหมด — admin only (สำหรับ filter dropdown)
 */
router.get('/faculties',
    authenticate,
    authorize('admin'),
    async (_req: Request, res: Response) => {
        const rows = await db('public.students')
            .distinct('faculty')
            .orderBy('faculty');
        res.json(rows.map((r: { faculty: string }) => r.faculty));
    }
);

async function logAudit(
    lineUserId: string,
    action: string,
    objectType: string,
    objectId: string
): Promise<void> {
    try {
        // actor_user_id expects UUID (public.users.id) — students are not in public.users
        // store LINE user ID in the action field as context instead
        await db('public.audit_log').insert({
            actor_user_id: null,
            actor_role: 'student',
            action: `${action}:${lineUserId}`,
            object_type: objectType,
            object_id: objectId,
        });
    } catch (err) {
        logger.error({ err }, 'Failed to write audit log');
    }
}

export default router;
