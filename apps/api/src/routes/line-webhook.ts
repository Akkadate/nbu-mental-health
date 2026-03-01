import { Router, Request, Response } from 'express';
import db from '../db.js';
import { logger } from '../logger.js';
import { verifyLineSignature } from '../middleware/line-signature.js';
import {
    pushMessage,
    replyMessage,
    buildWelcomeNewMessage,
    buildWelcomeBackMessage,
    buildSoftGateMessage,
    buildScreeningResultMessage,
    buildSafetyPackMessage,
    buildBookingReadyMessage,
    buildScreeningInviteMessage,
    buildNoAppointmentsMessage,
    buildAppointmentListMessage,
    buildResourceCategoryPickerMessage,
    buildResourcesMessage,
    assignGuestMenu,
    assignVerifiedMenu,
} from '../services/line-client.js';
import { config } from '../config.js';
import type { LineEvent } from '@nbu/shared';

const router = Router();

/**
 * Cross-request deduplication for LINE postback displayText echoes.
 * When a rich menu postback button has `displayText`, LINE sends TWO webhook events
 * (possibly in separate HTTP requests): a postback event and a text message echo.
 * We record the postback timestamp per userId, and in handleTextMessage we skip
 * processing if a postback was seen for this user within the last 5 seconds.
 */
const recentPostbacks = new Map<string, number>(); // userId → Date.now()

// Clean up stale entries every 30 seconds
setInterval(() => {
    const cutoff = Date.now() - 10_000;
    for (const [uid, ts] of recentPostbacks) {
        if (ts < cutoff) recentPostbacks.delete(uid);
    }
}, 30_000);

/**
 * Reply using replyToken when available (LINE auto-scrolls to reply),
 * otherwise fall back to pushMessage.
 */
async function reply(
    replyToken: string | undefined,
    userId: string,
    messages: import('@line/bot-sdk').messagingApi.Message[]
): Promise<void> {
    if (replyToken) {
        await replyMessage(replyToken, messages);
    } else {
        await pushMessage(userId, messages);
    }
}

/**
 * POST /webhooks/line
 * Main LINE webhook endpoint — receives all events from LINE platform
 */
router.post('/', verifyLineSignature, async (req: Request, res: Response) => {
    const events: LineEvent[] = req.body.events || [];

    // Return 200 immediately (LINE expects fast response)
    res.status(200).json({ ok: true });

    // Process events asynchronously
    for (const event of events) {
        try {
            await handleEvent(event);
        } catch (err) {
            logger.error({ err, event }, 'Error handling LINE event');
        }
    }
});

async function handleEvent(event: LineEvent): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    switch (event.type) {
        case 'follow':
            await handleFollow(userId);
            break;

        case 'postback':
            if (event.postback?.data) {
                recentPostbacks.set(userId, Date.now());
                await handlePostback(userId, event.postback.data, event.replyToken);
            }
            break;

        case 'message':
            if (event.message?.type === 'text' && event.message.text) {
                // Skip displayText echo: if this user had a postback within the last 5 seconds
                const postbackTs = recentPostbacks.get(userId);
                if (postbackTs && Date.now() - postbackTs < 5_000) {
                    recentPostbacks.delete(userId);
                    logger.debug({ userId }, 'Skipping displayText echo from postback');
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
            await handleBookingGate(userId, replyToken);
            break;

        case 'resources':
            await handleResources(userId, params.get('category'), replyToken);
            break;

        case 'my_appointments':
            await handleMyAppointments(userId, replyToken);
            break;

        case 'cancel_appt':
            await handleCancelAppt(userId, params.get('appt_id'), params.get('appt_type'), replyToken);
            break;

        case 'emergency_info':
            await reply(replyToken, userId, [buildSafetyPackMessage()]);
            break;

        default:
            logger.warn({ action, data }, 'Unknown postback action');
    }
}

// ─── Booking Gate (Soft Gate) ───

async function handleBookingGate(userId: string, replyToken?: string): Promise<void> {
    // Find student
    const lineLink = await db('public.line_links')
        .where({ line_user_id: userId })
        .first();

    if (!lineLink) {
        await reply(replyToken, userId, [{
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
        await reply(replyToken, userId, [buildBookingReadyMessage()]);
    } else {
        await reply(replyToken, userId, [buildSoftGateMessage()]);
    }
}

// ─── Resources ───

async function handleResources(userId: string, category: string | null, replyToken?: string): Promise<void> {
    // No category selected → show category picker card
    if (!category) {
        await reply(replyToken, userId, [buildResourceCategoryPickerMessage()]);
        return;
    }

    const resources = await db('public.resources')
        .where({ is_active: true, category })
        .orderBy('created_at', 'desc')
        .limit(5);

    if (resources.length === 0) {
        await reply(replyToken, userId, [{
            type: 'text',
            text: `📚 ยังไม่มีบทความในหมวด "${category}" กรุณาลองหมวดอื่น`,
        }]);
        return;
    }

    await reply(replyToken, userId, [buildResourcesMessage(resources.map((r: any) => ({
        title: r.title,
        category: r.category,
        description: r.content_markdown ?? null,
        url: r.url ?? null,
    })))]);
}

// ─── My Appointments ───

async function handleMyAppointments(userId: string, replyToken?: string): Promise<void> {
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
        await reply(replyToken, userId, [buildNoAppointmentsMessage()]);
        return;
    }

    await reply(replyToken, userId, [buildAppointmentListMessage(allAppts)]);
}

// ─── Cancel Appointment ───

async function handleCancelAppt(userId: string, apptId: string | null, apptType: string | null, replyToken?: string): Promise<void> {
    if (!apptId) {
        await reply(replyToken, userId, [{ type: 'text', text: 'ไม่พบข้อมูลนัดหมาย กรุณาลองใหม่' }]);
        return;
    }

    const table = apptType === 'advisor' ? 'advisory.appointments' : 'clinical.appointments';

    // Verify ownership via LINE link
    const lineLink = await db('public.line_links').where({ line_user_id: userId }).first();
    if (!lineLink) {
        await reply(replyToken, userId, [{ type: 'text', text: 'กรุณายืนยันตัวตนก่อนใช้งาน' }]);
        return;
    }

    const appt = await db(table)
        .where({ id: apptId, student_id: lineLink.student_id, status: 'scheduled' })
        .first();

    if (!appt) {
        await reply(replyToken, userId, [{ type: 'text', text: 'ไม่พบนัดหมายหรือยกเลิกแล้ว' }]);
        return;
    }

    await db(table).where({ id: apptId }).update({ status: 'cancelled' });

    const dt = new Date(appt.scheduled_at);
    const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    await reply(replyToken, userId, [{
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
        await reply(replyToken, userId, [{
            type: 'text',
            text: `🆔 LINE User ID ของคุณคือ:\n${userId}\n\nคัดลอก ID นี้ไปให้ admin เพื่อเชื่อม LINE\nหรือเข้าลิงก์นี้เพื่อเชื่อมด้วยตนเอง:\nhttps://liff.line.me/${config.LIFF_LINK_STAFF_ID}`,
        }]);
        return;
    }

    // Staff self-link shortcut
    if (normalized === '/linkstaff' || normalized.startsWith('/เชื่อมพนักงาน')) {
        await reply(replyToken, userId, [{
            type: 'text',
            text: `🔗 เชื่อม LINE กับบัญชีพนักงาน\n\nกดลิงก์ด้านล่างแล้วล็อกอินด้วยอีเมล/รหัสผ่านที่ได้รับจาก admin:\nhttps://liff.line.me/${config.LIFF_LINK_STAFF_ID}`,
        }]);
        return;
    }

    // Keyword matching
    if (['เริ่มต้น', 'สมัคร', 'ยืนยัน'].some((k) => normalized.includes(k))) {
        await reply(replyToken, userId, [{
            type: 'text',
            text: `กดปุ่ม 🔐 ยืนยันตัวตน ที่เมนูด้านล่างเพื่อเริ่มใช้งาน\n\nhttps://liff.line.me/${config.LIFF_VERIFY_ID}`,
        }]);
        return;
    }

    if (['ประเมิน', 'เครียด', 'แบบทดสอบ'].some((k) => normalized.includes(k))) {
        await reply(replyToken, userId, [buildScreeningInviteMessage()]);
        return;
    }

    if (['ดูนัด', 'นัดของฉัน', 'นัดไว้', 'นัดหมายของฉัน'].some((k) => normalized.includes(k))) {
        await handleMyAppointments(userId, replyToken);
        return;
    }

    if (['นัดหมาย', 'จองใหม่', 'นัดใหม่'].some((k) => normalized.includes(k))) {
        await handleBookingGate(userId, replyToken);
        return;
    }

    if (['แหล่งช่วยเหลือ', 'แหล่งข้อมูล', 'บทความ', 'ความรู้'].some((k) => normalized.includes(k))) {
        await handleResources(userId, null, replyToken);
        return;
    }

    if (['ฉุกเฉิน', 'ช่วย', 'ไม่ไหว', '1323'].some((k) => normalized.includes(k))) {
        await reply(replyToken, userId, [buildSafetyPackMessage()]);
        return;
    }

    // Default response
    await reply(replyToken, userId, [{
        type: 'text',
        text: '🤖 สวัสดีครับ ใช้เมนูด้านล่างเพื่อเข้าถึงบริการต่างๆ\n\nหรือพิมพ์คำค้นหา:\n• "ประเมิน" — ทำแบบประเมิน\n• "นัดหมาย" — จองนัดหมาย\n• "ดูนัด" — ดูนัดหมายของฉัน\n• "แหล่งช่วยเหลือ" — บทความและแหล่งข้อมูล\n• "ฉุกเฉิน" — สายด่วน 1323',
    }]);
}

export default router;
