import { Router, Request, Response } from 'express';
import db from '../db.js';
import { logger } from '../logger.js';
import { verifyLineSignature } from '../middleware/line-signature.js';
import {
    pushMessage,
    buildWelcomeNewMessage,
    buildWelcomeBackMessage,
    buildSoftGateMessage,
    buildScreeningResultMessage,
    buildSafetyPackMessage,
    assignGuestMenu,
    assignVerifiedMenu,
} from '../services/line-client.js';
import { config } from '../config.js';
import type { LineEvent } from '@nbu/shared';

const router = Router();

/**
 * POST /webhooks/line
 * Main LINE webhook endpoint — receives all events from LINE platform
 */
router.post('/', verifyLineSignature, async (req: Request, res: Response) => {
    const events: LineEvent[] = req.body.events || [];

    // Return 200 immediately (LINE expects fast response)
    res.status(200).json({ ok: true });

    // Process events asynchronously.
    // Track users who fired a postback in this batch so we can skip their displayText echo.
    const seenPostbackUsers = new Set<string>();
    for (const event of events) {
        try {
            await handleEvent(event, seenPostbackUsers);
        } catch (err) {
            logger.error({ err, event }, 'Error handling LINE event');
        }
    }
});

async function handleEvent(event: LineEvent, seenPostbackUsers?: Set<string>): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    switch (event.type) {
        case 'follow':
            await handleFollow(userId);
            break;

        case 'postback':
            if (event.postback?.data) {
                // Mark this user so we can skip their displayText echo later in this batch
                seenPostbackUsers?.add(userId);
                await handlePostback(userId, event.postback.data, event.replyToken);
            }
            break;

        case 'message':
            if (event.message?.type === 'text' && event.message.text) {
                // If user already had a postback in this batch, this text is a displayText echo
                if (seenPostbackUsers?.has(userId)) {
                    seenPostbackUsers.delete(userId);
                    logger.debug({ userId }, 'Skipping displayText echo for postback user');
                    return;
                }
                await handleTextMessage(userId, event.message.text, event.replyToken);
            }
            break;

        default:
            logger.debug({ type: event.type }, 'Unhandled LINE event type');
    }
}

// ─── Follow Handler ───

async function handleFollow(userId: string): Promise<void> {
    logger.info({ userId }, 'Follow event');

    const lineLink = await db('public.line_links')
        .where({ line_user_id: userId })
        .join('public.students', 'public.line_links.student_id', 'public.students.id')
        .select('public.students.student_code')
        .first();

    if (lineLink) {
        await assignVerifiedMenu(userId);
        await pushMessage(userId, [buildWelcomeBackMessage(lineLink.student_code)]);
    } else {
        await assignGuestMenu(userId);
        await pushMessage(userId, [buildWelcomeNewMessage()]);
    }
}

// ─── Postback Handler ───

async function handlePostback(userId: string, data: string, replyToken?: string): Promise<void> {
    const params = new URLSearchParams(data);
    const action = params.get('action');

    logger.info({ userId, action, data }, 'Postback event');

    switch (action) {
        case 'booking_gate':
            await handleBookingGate(userId);
            break;

        case 'resources':
            await handleResources(userId, params.get('category'));
            break;

        case 'my_appointments':
            await handleMyAppointments(userId);
            break;

        case 'cancel_appt':
            await handleCancelAppt(userId, params.get('appt_id'), params.get('appt_type'));
            break;

        case 'emergency_info':
            await pushMessage(userId, [buildSafetyPackMessage()]);
            break;

        default:
            logger.warn({ action, data }, 'Unknown postback action');
    }
}

// ─── Booking Gate (Soft Gate) ───

async function handleBookingGate(userId: string): Promise<void> {
    // Find student
    const lineLink = await db('public.line_links')
        .where({ line_user_id: userId })
        .first();

    if (!lineLink) {
        await pushMessage(userId, [{
            type: 'text',
            text: 'กรุณายืนยันตัวตนก่อนใช้งาน 🔐\nกดปุ่ม "ยืนยันตัวตน" ที่เมนูด้านล่าง',
        }]);
        return;
    }

    // Check for recent screening (within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentScreening = await db('clinical.screenings')
        .where({ student_id: lineLink.student_id })
        .where('created_at', '>', thirtyDaysAgo)
        .orderBy('created_at', 'desc')
        .first();

    if (recentScreening) {
        // Has recent screening → go directly to booking LIFF
        await pushMessage(userId, [{
            type: 'text',
            text: `📅 เปิดระบบนัดหมาย\nhttps://liff.line.me/${config.LIFF_BOOKING_ID}`,
        }]);
    } else {
        // No recent screening → show Soft Gate
        await pushMessage(userId, [buildSoftGateMessage()]);
    }
}

// ─── Resources ───

async function handleResources(userId: string, category: string | null): Promise<void> {
    let query = db('public.resources').where({ is_active: true });
    if (category) query = query.where({ category });

    const resources = await query.limit(10);

    if (resources.length === 0) {
        await pushMessage(userId, [{
            type: 'text',
            text: '📚 ยังไม่มีแหล่งช่วยเหลือในขณะนี้ กรุณาลองใหม่ภายหลัง',
        }]);
        return;
    }

    // Build Flex Carousel
    const bubbles = resources.map((r: any) => ({
        type: 'bubble' as const,
        body: {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [
                { type: 'text' as const, text: r.title, weight: 'bold' as const, size: 'md' as const, wrap: true },
                { type: 'text' as const, text: r.category, size: 'xs' as const, color: '#999999', margin: 'sm' as const },
            ],
        },
        footer: r.url ? {
            type: 'box' as const,
            layout: 'vertical' as const,
            contents: [{
                type: 'button' as const,
                action: { type: 'uri' as const, label: 'อ่านเพิ่มเติม', uri: r.url },
                style: 'link' as const,
            }],
        } : undefined,
    }));

    await pushMessage(userId, [{
        type: 'flex',
        altText: '📚 แหล่งช่วยเหลือตนเอง',
        contents: { type: 'carousel', contents: bubbles },
    }]);
}

// ─── My Appointments ───

async function handleMyAppointments(userId: string): Promise<void> {
    const lineLink = await db('public.line_links').where({ line_user_id: userId }).first();
    if (!lineLink) return;

    const now = new Date();

    // Get upcoming appointments from both advisory and clinical
    const advisoryAppts = await db('advisory.appointments')
        .where({ student_id: lineLink.student_id, status: 'scheduled' })
        .where('scheduled_at', '>=', now)
        .orderBy('scheduled_at', 'asc')
        .limit(5);

    const clinicalAppts = await db('clinical.appointments')
        .where({ student_id: lineLink.student_id, status: 'scheduled' })
        .where('scheduled_at', '>=', now)
        .orderBy('scheduled_at', 'asc')
        .limit(5);

    const allAppts = [
        ...advisoryAppts.map((a: any) => ({ ...a, type: 'advisor' })),
        ...clinicalAppts.map((a: any) => ({ ...a, type: 'counselor' })),
    ].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    if (allAppts.length === 0) {
        await pushMessage(userId, [{
            type: 'text',
            text: '📅 คุณยังไม่มีนัดหมายที่กำลังจะมาถึง\nกดปุ่ม "นัดหมาย" เพื่อจองเวลา',
        }]);
        return;
    }

    const lines = allAppts.map((a: any) => {
        const dt = new Date(a.scheduled_at);
        const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const typeLabel = a.type === 'advisor' ? 'อาจารย์ที่ปรึกษา' : 'นักจิตวิทยา';
        return `📆 ${dateStr} ${timeStr}\n   ${typeLabel} (${a.mode})`;
    });

    await pushMessage(userId, [{
        type: 'text',
        text: `📅 นัดหมายของคุณ\n\n${lines.join('\n\n')}`,
    }]);
}

// ─── Cancel Appointment ───

async function handleCancelAppt(userId: string, apptId: string | null, apptType: string | null): Promise<void> {
    if (!apptId) {
        await pushMessage(userId, [{ type: 'text', text: 'ไม่พบข้อมูลนัดหมาย กรุณาลองใหม่' }]);
        return;
    }

    const table = apptType === 'advisor' ? 'advisory.appointments' : 'clinical.appointments';

    // Verify ownership via LINE link
    const lineLink = await db('public.line_links').where({ line_user_id: userId }).first();
    if (!lineLink) {
        await pushMessage(userId, [{ type: 'text', text: 'กรุณายืนยันตัวตนก่อนใช้งาน' }]);
        return;
    }

    const appt = await db(table)
        .where({ id: apptId, student_id: lineLink.student_id, status: 'scheduled' })
        .first();

    if (!appt) {
        await pushMessage(userId, [{ type: 'text', text: 'ไม่พบนัดหมายหรือยกเลิกแล้ว' }]);
        return;
    }

    await db(table).where({ id: apptId }).update({ status: 'cancelled' });

    const dt = new Date(appt.scheduled_at);
    const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    await pushMessage(userId, [{
        type: 'text',
        text: `✅ ยกเลิกนัดหมายสำเร็จ\n\n📆 ${dateStr} เวลา ${timeStr}\n\nหากต้องการนัดใหม่ กดปุ่ม "นัดหมาย" ที่เมนูด้านล่าง`,
    }]);

    logger.info({ userId, apptId, apptType }, 'Appointment cancelled via LINE');
}

// ─── Text Message Handler ───

async function handleTextMessage(userId: string, text: string, replyToken?: string): Promise<void> {
    const normalized = text.trim().toLowerCase();

    // Staff LINE ID self-lookup command
    if (normalized === '/myid') {
        await pushMessage(userId, [{
            type: 'text',
            text: `🆔 LINE User ID ของคุณคือ:\n${userId}\n\nคัดลอก ID นี้ไปให้ admin เพื่อเชื่อม LINE\nหรือเข้าลิงก์นี้เพื่อเชื่อมด้วยตนเอง:\nhttps://liff.line.me/${config.LIFF_LINK_STAFF_ID}`,
        }]);
        return;
    }

    // Staff self-link shortcut
    if (normalized === '/linkstaff' || normalized.startsWith('/เชื่อมพนักงาน')) {
        await pushMessage(userId, [{
            type: 'text',
            text: `🔗 เชื่อม LINE กับบัญชีพนักงาน\n\nกดลิงก์ด้านล่างแล้วล็อกอินด้วยอีเมล/รหัสผ่านที่ได้รับจาก admin:\nhttps://liff.line.me/${config.LIFF_LINK_STAFF_ID}`,
        }]);
        return;
    }

    // Keyword matching
    if (['เริ่มต้น', 'สมัคร', 'ยืนยัน'].some((k) => normalized.includes(k))) {
        await pushMessage(userId, [{
            type: 'text',
            text: `กดปุ่ม 🔐 ยืนยันตัวตน ที่เมนูด้านล่างเพื่อเริ่มใช้งาน\n\nhttps://liff.line.me/${config.LIFF_VERIFY_ID}`,
        }]);
        return;
    }

    if (['ประเมิน', 'เครียด', 'แบบทดสอบ'].some((k) => normalized.includes(k))) {
        await pushMessage(userId, [{
            type: 'text',
            text: `🧠 เริ่มทำแบบประเมินได้เลย\n\nhttps://liff.line.me/${config.LIFF_SCREENING_ID}`,
        }]);
        return;
    }

    if (['ดูนัด', 'นัดของฉัน', 'นัดไว้', 'นัดหมายของฉัน'].some((k) => normalized.includes(k))) {
        await handleMyAppointments(userId);
        return;
    }

    if (['นัดหมาย', 'จองใหม่', 'นัดใหม่'].some((k) => normalized.includes(k))) {
        await handleBookingGate(userId);
        return;
    }

    if (['ฉุกเฉิน', 'ช่วย', 'ไม่ไหว', '1323'].some((k) => normalized.includes(k))) {
        await pushMessage(userId, [buildSafetyPackMessage()]);
        return;
    }

    // Default response
    await pushMessage(userId, [{
        type: 'text',
        text: '🤖 สวัสดีครับ ใช้เมนูด้านล่างเพื่อเข้าถึงบริการต่างๆ\n\nหรือพิมพ์คำค้นหา:\n• "ประเมิน" — ทำแบบประเมิน\n• "นัดหมาย" — จองนัดหมาย\n• "ดูนัด" — ดูนัดหมายของฉัน\n• "ฉุกเฉิน" — สายด่วน 1323',
    }]);
}

export default router;
