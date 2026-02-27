import { Router, Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import { schemas } from '@nbu/shared';
import db from '../db.js';
import { hashSensitiveData } from '../services/encryption.js';
import { assignVerifiedMenu } from '../services/line-client.js';
import { logger } from '../logger.js';
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
 */
router.post('/link-line', async (req: Request, res: Response) => {
    const parsed = schemas.LinkLineRequest.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
        return;
    }

    const { student_code, verify_doc_type, verify_token, verify_doc_number, line_user_id } = parsed.data;

    if (!checkRateLimit(line_user_id)) {
        res.status(429).json({ error: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' });
        return;
    }

    const existingLink = await db('public.line_links').where({ line_user_id }).first();
    if (existingLink) {
        res.status(409).json({ error: 'LINE account นี้เชื่อมต่อแล้ว' });
        return;
    }

    const student = await db('public.students').where({ student_code, status: 'active' }).first();
    if (!student) {
        logger.warn({ student_code, line_user_id }, 'Link attempt: student not found');
        res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
        return;
    }

    // Verify DOB — try hash first, then compare plain text dob if hash not set
    const dobHash = hashSensitiveData(verify_token);
    if (student.dob_hash) {
        if (student.dob_hash !== dobHash) {
            logger.warn({ student_code, line_user_id }, 'Link attempt: DOB mismatch');
            await logAudit(line_user_id, 'link_line_failed', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    } else if (student.dob) {
        // Compare plain text dob (stored as date, verify_token is YYYY-MM-DD string)
        const storedDob = new Date(student.dob).toISOString().split('T')[0];
        if (storedDob !== verify_token) {
            logger.warn({ student_code, line_user_id }, 'Link attempt: DOB mismatch (plain)');
            await logAudit(line_user_id, 'link_line_failed', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    }

    // Verify document number — try hash first, then compare plain text
    const docHash = hashSensitiveData(verify_doc_number);
    const docHashField = verify_doc_type === 'national_id' ? 'id_card_hash' : 'passport_hash';
    const docPlainField = verify_doc_type === 'national_id' ? 'id_card' : 'passport_no';

    if (student[docHashField]) {
        if (student[docHashField] !== docHash) {
            logger.warn({ student_code, line_user_id, verify_doc_type }, 'Link attempt: doc mismatch');
            await logAudit(line_user_id, 'link_line_failed', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    } else if (student[docPlainField]) {
        if (student[docPlainField] !== verify_doc_number.trim()) {
            logger.warn({ student_code, line_user_id, verify_doc_type }, 'Link attempt: doc mismatch (plain)');
            await logAudit(line_user_id, 'link_line_failed', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    }

    await db('public.line_links').insert({
        student_id: student.id,
        line_user_id,
        consent_version: 'v1',
        consented_at: new Date(),
    });

    if (!student.verify_doc_type) {
        await db('public.students').where({ id: student.id }).update({ verify_doc_type });
    }

    try {
        await assignVerifiedMenu(line_user_id);
    } catch (err) {
        logger.error({ err, line_user_id }, 'Failed to assign verified menu (non-blocking)');
    }

    await logAudit(line_user_id, 'link_line_success', 'student', student.id);
    logger.info({ student_code, line_user_id }, 'Student linked successfully');

    res.json({ linked: true, student_id: student.id });
});

/**
 * GET /students
 * รายชื่อนักศึกษาทั้งหมด — admin only
 */
router.get('/',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { search, faculty, linked, page = '1', limit = '50' } = req.query;

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

        const dataQuery = applyFilters(
            db('public.students as s')
                .leftJoin('public.line_links as l', 'l.student_id', 's.id')
                .select(
                    's.id', 's.student_code', 's.faculty', 's.year', 's.status',
                    's.created_at', 's.updated_at',
                    's.verify_doc_type',
                    's.dob',
                    's.id_card',
                    's.passport_no',
                    db.raw('l.line_user_id'),
                    db.raw('l.linked_at'),
                    db.raw('(s.dob_hash IS NOT NULL OR s.dob IS NOT NULL) as has_dob'),
                    db.raw('(s.id_card_hash IS NOT NULL OR s.id_card IS NOT NULL) as has_id_card'),
                    db.raw('(s.passport_hash IS NOT NULL OR s.passport_no IS NOT NULL) as has_passport'),
                )
        ).orderBy('s.student_code').limit(limitNum).offset(offset);

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
 * รายชื่อคณะทั้งหมด — admin only
 */
router.get('/faculties',
    authenticate,
    authorize('admin'),
    async (_req: Request, res: Response) => {
        const rows = await db('public.students').distinct('faculty').orderBy('faculty');
        res.json(rows.map((r: { faculty: string }) => r.faculty));
    }
);

/**
 * POST /students/import
 * นำเข้านักศึกษาจาก CSV (admin only)
 * CSV columns: student_code, faculty, year[, status[, dob[, id_card[, passport_no]]]]
 */
router.post('/import',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { csv } = req.body;
        if (typeof csv !== 'string' || !csv.trim()) {
            res.status(400).json({ error: 'csv field is required' });
            return;
        }

        let records: Record<string, string>[];
        try {
            records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            res.status(400).json({ error: `CSV parse error: ${msg}` });
            return;
        }

        let inserted = 0;
        let updated = 0;
        const errors: string[] = [];

        for (const [i, row] of records.entries()) {
            const rowNum = i + 2;
            const { student_code, faculty, year } = row;

            // status: ถ้าว่างหรือไม่มีคอลัมน์ → ใช้ 'active' เป็นค่าเริ่มต้น
            const status = (row.status && row.status.trim()) ? row.status.trim() : 'active';

            if (!student_code || !faculty || !year) {
                errors.push(`แถว ${rowNum}: ขาด student_code, faculty หรือ year`);
                continue;
            }

            const yearNum = parseInt(year, 10);
            if (isNaN(yearNum) || yearNum < 1 || yearNum > 10) {
                errors.push(`แถว ${rowNum} (${student_code}): year ต้องเป็น 1–10`);
                continue;
            }

            if (!['active', 'inactive'].includes(status)) {
                errors.push(`แถว ${rowNum} (${student_code}): status ต้องเป็น active หรือ inactive`);
                continue;
            }

            // Optional plain text identity fields
            const dob = (row.dob && row.dob.trim()) ? row.dob.trim() : undefined;
            const id_card = (row.id_card && row.id_card.trim()) ? row.id_card.trim() : undefined;
            const passport_no = (row.passport_no && row.passport_no.trim()) ? row.passport_no.trim() : undefined;

            // Build update payload (include hash fields so link-line verification works)
            const payload: Record<string, unknown> = {
                faculty, year: yearNum, status,
                updated_at: new Date(),
            };
            if (dob !== undefined) {
                payload.dob = dob;
                payload.dob_hash = hashSensitiveData(dob);
            }
            if (id_card !== undefined) {
                payload.id_card = id_card;
                payload.id_card_hash = hashSensitiveData(id_card);
                payload.verify_doc_type = 'national_id';
            }
            if (passport_no !== undefined) {
                payload.passport_no = passport_no;
                payload.passport_hash = hashSensitiveData(passport_no);
                if (!id_card) payload.verify_doc_type = 'passport';
            }

            try {
                const existing = await db('public.students').where({ student_code }).first();
                if (existing) {
                    await db('public.students').where({ student_code }).update(payload);
                    updated++;
                } else {
                    await db('public.students').insert({ student_code, ...payload });
                    inserted++;
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                errors.push(`แถว ${rowNum} (${student_code}): ${msg}`);
            }
        }

        res.json({ inserted, updated, errors });
    }
);

/**
 * PATCH /students/:id
 * แก้ไขข้อมูลนักศึกษา — admin only
 * Supports: faculty, year, status, dob, id_card, passport_no
 */
router.patch('/:id',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { faculty, year, status, dob, id_card, passport_no } = req.body;
        const updates: Record<string, unknown> = { updated_at: new Date() };

        if (faculty !== undefined) updates.faculty = String(faculty).trim();

        if (year !== undefined) {
            const y = parseInt(String(year), 10);
            if (isNaN(y) || y < 1 || y > 10) {
                res.status(400).json({ error: 'year ต้องเป็น 1–10' });
                return;
            }
            updates.year = y;
        }

        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                res.status(400).json({ error: 'status ต้องเป็น active หรือ inactive' });
                return;
            }
            updates.status = status;
        }

        // Plain text + recompute hash so link-line still works
        if (dob !== undefined) {
            const d = String(dob).trim();
            updates.dob = d || null;
            updates.dob_hash = d ? hashSensitiveData(d) : null;
        }

        if (id_card !== undefined) {
            const v = String(id_card).trim();
            updates.id_card = v || null;
            updates.id_card_hash = v ? hashSensitiveData(v) : null;
            if (v) updates.verify_doc_type = 'national_id';
        }

        if (passport_no !== undefined) {
            const v = String(passport_no).trim();
            updates.passport_no = v || null;
            updates.passport_hash = v ? hashSensitiveData(v) : null;
            // Only set passport verify_doc_type if no id_card exists after update
            if (v && updates.id_card === undefined) {
                // Check existing id_card
                const existing = await db('public.students').where({ id: req.params.id }).first();
                if (!existing?.id_card) updates.verify_doc_type = 'passport';
            }
        }

        const [updated] = await db('public.students')
            .where({ id: req.params.id })
            .update(updates)
            .returning([
                'id', 'student_code', 'faculty', 'year', 'status',
                'created_at', 'updated_at', 'verify_doc_type',
                'dob', 'id_card', 'passport_no',
            ]);

        if (!updated) {
            res.status(404).json({ error: 'ไม่พบนักศึกษา' });
            return;
        }

        res.json(updated);
    }
);

/**
 * DELETE /students/:id
 * ลบนักศึกษา — admin only
 */
router.delete('/:id',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        await db('public.line_links').where({ student_id: req.params.id }).delete();
        const count = await db('public.students').where({ id: req.params.id }).delete();

        if (!count) {
            res.status(404).json({ error: 'ไม่พบนักศึกษา' });
            return;
        }

        res.status(204).send();
    }
);

async function logAudit(
    lineUserId: string,
    action: string,
    objectType: string,
    objectId: string
): Promise<void> {
    try {
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
