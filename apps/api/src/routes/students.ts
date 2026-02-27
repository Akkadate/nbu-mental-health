import { Router, Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import { schemas } from '@nbu/shared';
import db from '../db.js';
import { hashSensitiveData } from '../services/encryption.js';
import { assignVerifiedMenu } from '../services/line-client.js';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

// ── Normalization helpers ─────────────────────────────────────────────────────

/**
 * Normalize Thai national ID / เลขบัตรชมพู — remove ALL non-digit characters.
 * เช่น "1-2345-67890-12-3" → "1234567890123"
 */
function normalizeIdCard(s: string): string {
    return s.replace(/\D/g, '');
}

/**
 * Normalize passport number — trim + uppercase.
 * เช่น " aa1234567 " → "AA1234567"
 */
function normalizePassport(s: string): string {
    return s.trim().toUpperCase();
}

/**
 * Normalize DOB string from various sources → YYYY-MM-DD safe comparison.
 * Handles: Date object | "2002-05-15" | "2002-05-15T00:00:00.000Z"
 */
function normalizeDob(dob: unknown): string {
    if (dob instanceof Date) {
        // Use UTC to avoid timezone shift
        const y = dob.getUTCFullYear();
        const m = String(dob.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dob.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(dob).slice(0, 10);
}

// ── Rate limit ────────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
}

// ── Hash helpers (normalized) ─────────────────────────────────────────────────

function hashDob(dob: string): string {
    return hashSensitiveData(dob.trim());
}

function hashIdCard(idCard: string): string {
    return hashSensitiveData(normalizeIdCard(idCard));
}

function hashPassport(passport: string): string {
    return hashSensitiveData(normalizePassport(passport));
}

// ── POST /students/link-line ──────────────────────────────────────────────────

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
        logger.warn({ student_code, line_user_id }, 'Link attempt: student not found or inactive');
        res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
        return;
    }

    // Check if this student_id is already linked to a different LINE account
    const studentAlreadyLinked = await db('public.line_links').where({ student_id: student.id }).first();
    if (studentAlreadyLinked) {
        logger.warn({ student_code, line_user_id }, 'Link attempt: student already linked to another LINE account');
        await logAudit(line_user_id, 'link_line_failed_student_taken', 'student', student.id);
        res.status(409).json({ error: 'รหัสนักศึกษานี้เชื่อมต่อกับบัญชี LINE อื่นแล้ว กรุณาติดต่อเจ้าหน้าที่' });
        return;
    }

    // ── Verify DOB ─────────────────────────────────────────────────────────
    const inputDob = verify_token.trim();
    const inputDobHash = hashDob(inputDob);

    if (student.dob_hash) {
        if (student.dob_hash !== inputDobHash) {
            logger.warn({ student_code, line_user_id }, 'Link attempt: DOB hash mismatch');
            await logAudit(line_user_id, 'link_line_failed_dob', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    } else if (student.dob) {
        const storedDob = normalizeDob(student.dob);
        if (storedDob !== inputDob) {
            logger.warn({ student_code, line_user_id, storedDob, inputDob }, 'Link attempt: DOB plain mismatch');
            await logAudit(line_user_id, 'link_line_failed_dob', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    }
    // If neither dob_hash nor dob → skip DOB check

    // ── Verify Document ────────────────────────────────────────────────────
    const docHashField = verify_doc_type === 'national_id' ? 'id_card_hash' : 'passport_hash';
    const docPlainField = verify_doc_type === 'national_id' ? 'id_card' : 'passport_no';

    const inputDocHash = verify_doc_type === 'national_id'
        ? hashIdCard(verify_doc_number)
        : hashPassport(verify_doc_number);

    if (student[docHashField]) {
        if (student[docHashField] !== inputDocHash) {
            logger.warn({ student_code, line_user_id, verify_doc_type }, 'Link attempt: doc hash mismatch');
            await logAudit(line_user_id, 'link_line_failed_doc', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    } else if (student[docPlainField]) {
        const storedDoc = verify_doc_type === 'national_id'
            ? normalizeIdCard(student[docPlainField])
            : normalizePassport(student[docPlainField]);
        const inputDocNorm = verify_doc_type === 'national_id'
            ? normalizeIdCard(verify_doc_number)
            : normalizePassport(verify_doc_number);

        if (storedDoc !== inputDocNorm) {
            logger.warn({ student_code, line_user_id, verify_doc_type }, 'Link attempt: doc plain mismatch');
            await logAudit(line_user_id, 'link_line_failed_doc', 'student', student.id);
            res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
            return;
        }
    }
    // If neither hash nor plain → skip document check

    await db('public.line_links').insert({
        student_id: student.id,
        line_user_id,
        consent_version: 'v1',
        consented_at: new Date(),
    });

    if (!student.verify_doc_type) {
        await db('public.students').where({ id: student.id }).update({ verify_doc_type });
    }

    let richMenuAssigned = false;
    try {
        await assignVerifiedMenu(line_user_id);
        richMenuAssigned = true;
        logger.info({ line_user_id, richMenuId: config.RICH_MENU_VERIFIED_ID }, 'Verified rich menu assigned');
    } catch (err) {
        logger.error({ err, line_user_id }, 'Failed to assign verified menu (non-blocking)');
    }

    await logAudit(line_user_id, 'link_line_success', 'student', student.id);
    logger.info({ student_code, line_user_id, richMenuAssigned }, 'Student linked successfully');

    res.json({ linked: true, student_id: student.id, rich_menu_assigned: richMenuAssigned });
});

// ── GET /students ─────────────────────────────────────────────────────────────

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
                    's.created_at', 's.updated_at', 's.verify_doc_type',
                    's.dob', 's.id_card', 's.passport_no',
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

// ── GET /students/faculties ───────────────────────────────────────────────────

router.get('/faculties',
    authenticate,
    authorize('admin'),
    async (_req: Request, res: Response) => {
        const rows = await db('public.students').distinct('faculty').orderBy('faculty');
        res.json(rows.map((r: { faculty: string }) => r.faculty));
    }
);

// ── POST /students/test-link ──────────────────────────────────────────────────
/**
 * Debug endpoint: ทดสอบว่าข้อมูลที่นักศึกษากรอกจะผ่าน link-line ได้หรือไม่
 * Admin only — ใช้สำหรับ troubleshoot เมื่อนักศึกษาไม่สามารถเชื่อม LINE ได้
 */
router.post('/test-link',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const { student_code, dob, doc_type, doc_number } = req.body as {
            student_code: string;
            dob: string;
            doc_type: 'national_id' | 'passport';
            doc_number: string;
        };

        if (!student_code) {
            res.status(400).json({ error: 'student_code is required' });
            return;
        }

        const student = await db('public.students').where({ student_code }).first();

        if (!student) {
            res.json({
                found: false,
                message: 'ไม่พบรหัสนักศึกษาในระบบ',
            });
            return;
        }

        const result: Record<string, unknown> = {
            found: true,
            status: student.status,
            verify_doc_type: student.verify_doc_type,
            // What's stored
            stored_dob: student.dob ? normalizeDob(student.dob) : null,
            stored_id_card: student.id_card ?? null,
            stored_passport_no: student.passport_no ?? null,
            has_dob_hash: !!student.dob_hash,
            has_id_card_hash: !!student.id_card_hash,
            has_passport_hash: !!student.passport_hash,
            already_linked: false,
        };

        // Check if already linked
        const link = await db('public.line_links').where({ student_id: student.id }).first();
        result.already_linked = !!link;

        if (student.status !== 'active') {
            result.dob_check = 'skipped';
            result.doc_check = 'skipped';
            result.verdict = `FAIL — สถานะ: ${student.status}`;
            res.json(result);
            return;
        }

        // ── Test DOB ──
        if (dob) {
            const inputDob = dob.trim();
            const inputDobHash = hashDob(inputDob);

            if (student.dob_hash) {
                result.dob_check = student.dob_hash === inputDobHash ? 'pass (hash)' : 'FAIL (hash mismatch)';
            } else if (student.dob) {
                const storedDob = normalizeDob(student.dob);
                result.dob_check = storedDob === inputDob ? 'pass (plain)' : `FAIL (plain mismatch: stored=${storedDob}, input=${inputDob})`;
            } else {
                result.dob_check = 'skip (no data stored)';
            }
        } else {
            result.dob_check = 'not tested';
        }

        // ── Test Document ──
        if (doc_number && doc_type) {
            const docHashField = doc_type === 'national_id' ? 'id_card_hash' : 'passport_hash';
            const docPlainField = doc_type === 'national_id' ? 'id_card' : 'passport_no';
            const inputDocHash = doc_type === 'national_id' ? hashIdCard(doc_number) : hashPassport(doc_number);
            const inputDocNorm = doc_type === 'national_id' ? normalizeIdCard(doc_number) : normalizePassport(doc_number);

            result.input_doc_normalized = inputDocNorm;

            if (student[docHashField]) {
                result.doc_check = student[docHashField] === inputDocHash ? 'pass (hash)' : 'FAIL (hash mismatch)';
                // Also show what the hash of stored plain text would be (if available)
                if (student[docPlainField]) {
                    const storedNorm = doc_type === 'national_id'
                        ? normalizeIdCard(student[docPlainField])
                        : normalizePassport(student[docPlainField]);
                    result.stored_doc_normalized = storedNorm;
                }
            } else if (student[docPlainField]) {
                const storedNorm = doc_type === 'national_id'
                    ? normalizeIdCard(student[docPlainField])
                    : normalizePassport(student[docPlainField]);
                result.stored_doc_normalized = storedNorm;
                result.doc_check = storedNorm === inputDocNorm ? 'pass (plain)' : `FAIL (plain mismatch)`;
            } else {
                result.doc_check = 'skip (no data stored)';
            }
        } else {
            result.doc_check = 'not tested';
        }

        const dobPass = !result.dob_check || String(result.dob_check).startsWith('pass') || String(result.dob_check).startsWith('skip') || result.dob_check === 'not tested';
        const docPass = !result.doc_check || String(result.doc_check).startsWith('pass') || String(result.doc_check).startsWith('skip') || result.doc_check === 'not tested';

        result.verdict = (dobPass && docPass)
            ? (result.already_linked ? 'ALREADY_LINKED — เชื่อมแล้ว' : 'PASS — เชื่อม LINE ได้')
            : 'FAIL — ข้อมูลไม่ตรง';

        res.json(result);
    }
);

// ── POST /students/import ─────────────────────────────────────────────────────

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

            const dobRaw = (row.dob && row.dob.trim()) ? row.dob.trim() : undefined;
            const idCardRaw = (row.id_card && row.id_card.trim()) ? row.id_card.trim() : undefined;
            const passportRaw = (row.passport_no && row.passport_no.trim()) ? row.passport_no.trim() : undefined;

            const payload: Record<string, unknown> = {
                faculty, year: yearNum, status,
                updated_at: new Date(),
            };

            if (dobRaw !== undefined) {
                payload.dob = dobRaw;
                payload.dob_hash = hashDob(dobRaw);
            }
            if (idCardRaw !== undefined) {
                payload.id_card = idCardRaw;
                payload.id_card_hash = hashIdCard(idCardRaw); // normalized: digits only
                payload.verify_doc_type = 'national_id';
            }
            if (passportRaw !== undefined) {
                payload.passport_no = normalizePassport(passportRaw);
                payload.passport_hash = hashPassport(passportRaw); // normalized: uppercase
                if (!idCardRaw) payload.verify_doc_type = 'passport';
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

// ── PATCH /students/:id ───────────────────────────────────────────────────────

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

        if (dob !== undefined) {
            const d = String(dob).trim();
            updates.dob = d || null;
            updates.dob_hash = d ? hashDob(d) : null;
        }

        if (id_card !== undefined) {
            const v = String(id_card).trim();
            updates.id_card = v || null;
            updates.id_card_hash = v ? hashIdCard(v) : null;
            if (v) updates.verify_doc_type = 'national_id';
        }

        if (passport_no !== undefined) {
            const v = String(passport_no).trim();
            updates.passport_no = v ? normalizePassport(v) : null;
            updates.passport_hash = v ? hashPassport(v) : null;
            if (v && updates.id_card === undefined) {
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

// ── DELETE /students/:id/line-link ───────────────────────────────────────────
/**
 * ยกเลิกการเชื่อม LINE ของนักศึกษา (ไม่ลบข้อมูลนักศึกษา)
 * ใช้เมื่อนักศึกษาต้องการเชื่อม LINE ใหม่ หรือเปลี่ยนโทรศัพท์
 */
router.delete('/:id/line-link',
    authenticate,
    authorize('admin'),
    async (req: Request, res: Response) => {
        const student = await db('public.students').where({ id: req.params.id }).first();
        if (!student) {
            res.status(404).json({ error: 'ไม่พบนักศึกษา' });
            return;
        }

        const deleted = await db('public.line_links').where({ student_id: req.params.id }).delete();

        if (!deleted) {
            res.status(404).json({ error: 'นักศึกษานี้ยังไม่ได้เชื่อม LINE' });
            return;
        }

        logger.info({ student_code: student.student_code }, 'LINE link removed by admin');
        res.json({ unlinked: true, student_code: student.student_code });
    }
);

// ── DELETE /students/:id ──────────────────────────────────────────────────────

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

// ── Audit log helper ──────────────────────────────────────────────────────────

async function logAudit(lineUserId: string, action: string, objectType: string, objectId: string): Promise<void> {
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
