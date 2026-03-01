import { messagingApi } from '@line/bot-sdk';
import { config } from '../config.js';
import { logger } from '../logger.js';

const client = new messagingApi.MessagingApiClient({
    channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN,
});

// ─── Push Messages ───

export async function pushMessage(userId: string, messages: messagingApi.Message[]): Promise<void> {
    try {
        await client.pushMessage({ to: userId, messages });
    } catch (err) {
        logger.error({ err, userId }, 'Failed to push LINE message');
        throw err;
    }
}

export async function replyMessage(replyToken: string, messages: messagingApi.Message[]): Promise<void> {
    try {
        await client.replyMessage({ replyToken, messages });
    } catch (err) {
        logger.error({ err }, 'Failed to reply LINE message');
        throw err;
    }
}

// ─── Rich Menu ───

export async function linkRichMenu(userId: string, richMenuId: string): Promise<void> {
    try {
        await client.linkRichMenuIdToUser(userId, richMenuId);
        logger.info({ userId, richMenuId }, 'Linked rich menu to user');
    } catch (err) {
        logger.error({ err, userId, richMenuId }, 'Failed to link rich menu');
        throw err;
    }
}

export async function assignGuestMenu(userId: string): Promise<void> {
    if (!config.RICH_MENU_GUEST_ID) {
        logger.warn('RICH_MENU_GUEST_ID is not set — skipping guest menu assignment');
        return;
    }
    await linkRichMenu(userId, config.RICH_MENU_GUEST_ID);
}

export async function assignVerifiedMenu(userId: string): Promise<void> {
    if (!config.RICH_MENU_VERIFIED_ID) {
        throw new Error('RICH_MENU_VERIFIED_ID is not configured in environment variables');
    }
    await linkRichMenu(userId, config.RICH_MENU_VERIFIED_ID);
}

// ─── Flex Message Builders ───

export function buildTextMessage(text: string): messagingApi.TextMessage {
    return { type: 'text', text };
}

export function buildWelcomeNewMessage(): messagingApi.FlexMessage {
    return {
        type: 'flex',
        altText: 'ยินดีต้อนรับ! กรุณายืนยันตัวตนก่อนเริ่มใช้งาน',
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'สวัสดี! 👋',
                        weight: 'bold',
                        size: 'xl',
                    },
                    {
                        type: 'text',
                        text: 'ยินดีต้อนรับสู่ระบบดูแลสุขภาพจิต\nมหาวิทยาลัยนอร์ทกรุงเทพ',
                        wrap: true,
                        margin: 'md',
                        size: 'sm',
                        color: '#666666',
                    },
                    {
                        type: 'text',
                        text: 'กดปุ่ม 🔐 ยืนยันตัวตน ที่เมนูด้านล่างเพื่อเริ่มใช้งาน',
                        wrap: true,
                        margin: 'lg',
                        size: 'sm',
                    },
                ],
            },
        },
    };
}

export function buildWelcomeBackMessage(studentCode: string): messagingApi.FlexMessage {
    return {
        type: 'flex',
        altText: `ยินดีต้อนรับกลับ! (${studentCode})`,
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'ยินดีต้อนรับกลับ! 😊',
                        weight: 'bold',
                        size: 'xl',
                    },
                    {
                        type: 'text',
                        text: `รหัสนักศึกษา: ${studentCode}`,
                        margin: 'md',
                        size: 'sm',
                        color: '#666666',
                    },
                    {
                        type: 'text',
                        text: 'เลือกเมนูด้านล่างเพื่อเริ่มใช้งาน',
                        wrap: true,
                        margin: 'lg',
                        size: 'sm',
                    },
                ],
            },
        },
    };
}

export function buildSoftGateMessage(): messagingApi.FlexMessage {
    return {
        type: 'flex',
        altText: 'แนะนำประเมินตนเองก่อนนัดหมาย',
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '📋 แนะนำสำหรับคุณ',
                        weight: 'bold',
                        size: 'lg',
                    },
                    {
                        type: 'text',
                        text: 'การประเมินตนเองก่อนนัดหมาย จะช่วยให้ผู้เชี่ยวชาญเตรียมตัวดูแลคุณได้ดียิ่งขึ้น\n\n⏱ ใช้เวลาเพียง 3-5 นาที',
                        wrap: true,
                        margin: 'md',
                        size: 'sm',
                        color: '#666666',
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🧠 ประเมินก่อนนัด (แนะนำ)',
                            uri: `https://liff.line.me/${config.LIFF_SCREENING_ID}?next=booking`,
                        },
                        style: 'primary',
                        color: '#4CAF50',
                    },
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '📅 ข้ามไปนัดหมายเลย',
                            uri: `https://liff.line.me/${config.LIFF_BOOKING_ID}`,
                        },
                        style: 'link',
                    },
                ],
            },
        },
    };
}

export function buildScreeningResultMessage(
    riskLevel: string,
    suggestion: string,
    showBookingCTA: boolean
): messagingApi.FlexMessage {
    const riskEmoji: Record<string, string> = {
        low: '🌿',
        moderate: '💛',
        high: '🧡',
        crisis: '❤️',
    };

    const riskLabel: Record<string, string> = {
        low: 'ระดับต่ำ',
        moderate: 'ระดับปานกลาง',
        high: 'ระดับสูง',
        crisis: 'ต้องการความช่วยเหลือเร่งด่วน',
    };

    const emoji = riskEmoji[riskLevel] || '📊';
    const label = riskLabel[riskLevel] || riskLevel;

    const footerContents: any[] = [];
    if (showBookingCTA) {
        footerContents.push({
            type: 'button',
            action: {
                type: 'uri',
                label: '📅 นัดหมายพูดคุย',
                uri: `https://liff.line.me/${config.LIFF_BOOKING_ID}`,
            },
            style: 'primary',
            color: '#2196F3',
        });
    }

    footerContents.push({
        type: 'button',
        action: {
            type: 'postback',
            label: '📚 แหล่งช่วยเหลือ',
            data: 'action=resources',
        },
        style: 'link',
    });

    return {
        type: 'flex',
        altText: `ผลการประเมิน: ${label}`,
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: `${emoji} ผลการประเมิน`,
                        weight: 'bold',
                        size: 'lg',
                    },
                    {
                        type: 'text',
                        text: label,
                        weight: 'bold',
                        size: 'md',
                        margin: 'md',
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'text',
                        text: suggestion,
                        wrap: true,
                        margin: 'lg',
                        size: 'sm',
                        color: '#666666',
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: footerContents,
            },
        },
    };
}

export function buildSafetyPackMessage(): messagingApi.FlexMessage {
    return {
        type: 'flex',
        altText: 'ข้อมูลช่วยเหลือฉุกเฉิน — สายด่วนสุขภาพจิต 1323',
        contents: {
            type: 'bubble',
            styles: {
                body: { backgroundColor: '#FFF3E0' },
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '❤️ เราห่วงใยคุณ',
                        weight: 'bold',
                        size: 'xl',
                    },
                    {
                        type: 'text',
                        text: 'คุณไม่ได้อยู่คนเดียว มีคนพร้อมช่วยเหลือเสมอ',
                        wrap: true,
                        margin: 'md',
                        size: 'sm',
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'text',
                        text: '📞 สายด่วนสุขภาพจิต: 1323 (24 ชม.)\n📞 สายด่วนฉุกเฉิน: 191\n🏥 ห้องพยาบาล มนบ.: 02-972-7200',
                        wrap: true,
                        margin: 'lg',
                        size: 'sm',
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '📞 โทร 1323 ทันที',
                            uri: 'tel:1323',
                        },
                        style: 'primary',
                        color: '#E53935',
                    },
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '📅 นัดพบนักจิตวิทยา',
                            uri: `https://liff.line.me/${config.LIFF_BOOKING_ID}`,
                        },
                        style: 'secondary',
                    },
                ],
            },
        },
    };
}

export function buildStaffNotification(
    caseId: string,
    priority: string,
    dashboardUrl: string
): messagingApi.FlexMessage {
    const isEscalation = false;
    const emoji = priority === 'crisis' ? '🔴' : '🟠';

    return {
        type: 'flex',
        altText: `🔔 แจ้งเตือนเคสใหม่ — Priority: ${priority.toUpperCase()}`,
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🔔 แจ้งเตือนเคสใหม่',
                        weight: 'bold',
                        size: 'lg',
                    },
                    {
                        type: 'text',
                        text: `Priority: ${emoji} ${priority.toUpperCase()}`,
                        margin: 'md',
                        size: 'sm',
                    },
                    {
                        type: 'text',
                        text: `Case: ${caseId}`,
                        margin: 'sm',
                        size: 'sm',
                        color: '#666666',
                    },
                    {
                        type: 'text',
                        text: priority === 'crisis'
                            ? 'กรุณาตรวจสอบภายใน 30 นาที'
                            : 'กรุณาตรวจสอบเมื่อสะดวก',
                        margin: 'md',
                        size: 'sm',
                        wrap: true,
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🔗 เปิด Dashboard',
                            uri: dashboardUrl,
                        },
                        style: 'primary',
                    },
                ],
            },
        },
    };
}

// ─── Typed helpers for dynamic builders ───

export interface AppointmentCardItem {
    id: string;
    scheduled_at: string | Date;
    mode: string;
    type: 'advisor' | 'counselor';
}

export interface ResourceItem {
    title: string;
    category: string;
    description?: string | null;
    url?: string | null;
}

// ─── Booking Ready Message ───
// Shown when student has a recent screening and taps "นัดหมาย"

export function buildBookingReadyMessage(): messagingApi.FlexMessage {
    return {
        type: 'flex',
        altText: '📅 เลือกประเภทการนัดหมาย',
        contents: {
            type: 'bubble',
            styles: { header: { backgroundColor: '#1565C0' } },
            header: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '📅 ระบบนัดหมาย', color: '#FFFFFF', weight: 'bold', size: 'xl' },
                    { type: 'text', text: 'เลือกผู้เชี่ยวชาญที่ต้องการนัดพบ', color: '#BBDEFB', size: 'sm', margin: 'xs' },
                ],
            },
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: 'lg',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            { type: 'text', text: '👔', size: 'xxl', flex: 0, gravity: 'center' },
                            {
                                type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
                                contents: [
                                    { type: 'text', text: 'อาจารย์ที่ปรึกษา', weight: 'bold', size: 'sm' },
                                    { type: 'text', text: 'ปรึกษาด้านการเรียนและชีวิตทั่วไป', size: 'xs', color: '#888888', wrap: true },
                                ],
                            },
                        ],
                    },
                    { type: 'separator' },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            { type: 'text', text: '🩺', size: 'xxl', flex: 0, gravity: 'center' },
                            {
                                type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
                                contents: [
                                    { type: 'text', text: 'นักจิตวิทยา', weight: 'bold', size: 'sm' },
                                    { type: 'text', text: 'ปรึกษาด้านสุขภาพจิตและอารมณ์', size: 'xs', color: '#888888', wrap: true },
                                ],
                            },
                        ],
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                paddingAll: 'lg',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '👔 นัดอาจารย์ที่ปรึกษา',
                            uri: `https://liff.line.me/${config.LIFF_BOOKING_ID}?type=advisor`,
                        },
                        style: 'secondary',
                        height: 'sm',
                    },
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🩺 นัดนักจิตวิทยา',
                            uri: `https://liff.line.me/${config.LIFF_BOOKING_ID}?type=counselor`,
                        },
                        style: 'primary',
                        color: '#1565C0',
                        height: 'sm',
                    },
                ],
            },
        },
    };
}

// ─── Screening Invite Message ───
// Shown when user types "ประเมิน" or similar keywords

export function buildScreeningInviteMessage(): messagingApi.FlexMessage {
    return {
        type: 'flex',
        altText: '🧠 ทำแบบประเมินสุขภาพจิต',
        contents: {
            type: 'bubble',
            styles: { header: { backgroundColor: '#2E7D32' } },
            header: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: '🧠 ประเมินสุขภาพจิต', color: '#FFFFFF', weight: 'bold', size: 'xl' },
                    { type: 'text', text: 'เข้าใจตัวเองและรับคำแนะนำที่เหมาะสม', color: '#C8E6C9', size: 'sm', margin: 'xs' },
                ],
            },
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: 'lg',
                contents: [
                    { type: 'text', text: 'เลือกประเภทแบบประเมิน', weight: 'bold', size: 'sm', color: '#333333' },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        margin: 'sm',
                        contents: [
                            { type: 'text', text: '⚡', size: 'xl', flex: 0, gravity: 'center' },
                            {
                                type: 'box', layout: 'vertical', flex: 1,
                                contents: [
                                    { type: 'text', text: 'ประเมินด่วน', weight: 'bold', size: 'sm' },
                                    { type: 'text', text: '3–5 คำถาม  •  ใช้เวลา ~2 นาที', size: 'xs', color: '#888888' },
                                ],
                            },
                        ],
                    },
                    { type: 'separator' },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            { type: 'text', text: '📋', size: 'xl', flex: 0, gravity: 'center' },
                            {
                                type: 'box', layout: 'vertical', flex: 1,
                                contents: [
                                    { type: 'text', text: 'ประเมินเต็ม (PHQ-9 / GAD-7)', weight: 'bold', size: 'sm' },
                                    { type: 'text', text: 'ครอบคลุมกว่า  •  ใช้เวลา ~5 นาที', size: 'xs', color: '#888888' },
                                ],
                            },
                        ],
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🚀 เริ่มทำแบบประเมิน',
                            uri: `https://liff.line.me/${config.LIFF_SCREENING_ID}`,
                        },
                        style: 'primary',
                        color: '#2E7D32',
                    },
                ],
            },
        },
    };
}

// ─── No Appointments Message ───
// Shown when student has no upcoming appointments

export function buildNoAppointmentsMessage(): messagingApi.FlexMessage {
    return {
        type: 'flex',
        altText: '📅 ยังไม่มีนัดหมายที่กำลังจะมาถึง',
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: 'xl',
                contents: [
                    { type: 'text', text: '📅', size: 'xxl', align: 'center' },
                    { type: 'text', text: 'ยังไม่มีนัดหมาย', weight: 'bold', size: 'lg', align: 'center', margin: 'md' },
                    {
                        type: 'text',
                        text: 'คุณยังไม่มีนัดหมายที่กำลังจะมาถึง\nกดปุ่มด้านล่างเพื่อจองนัดได้เลย',
                        size: 'sm', color: '#888888', align: 'center', wrap: true, margin: 'sm',
                    },
                ],
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: 'lg',
                contents: [
                    {
                        type: 'button',
                        action: { type: 'postback', label: '📅 จองนัดหมายใหม่', data: 'action=booking_gate' },
                        style: 'primary',
                        color: '#1565C0',
                    },
                ],
            },
        },
    };
}

// ─── Appointment List Message ───
// Carousel of upcoming appointment cards with cancel button

export function buildAppointmentListMessage(appts: AppointmentCardItem[]): messagingApi.FlexMessage {
    const bubbles = appts.map((a) => {
        const dt = new Date(a.scheduled_at);
        const dateStr = dt.toLocaleDateString('th-TH', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok',
        });
        const timeStr = dt.toLocaleTimeString('th-TH', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
        });
        const isAdvisor = a.type === 'advisor';
        const typeLabel = isAdvisor ? 'อาจารย์ที่ปรึกษา' : 'นักจิตวิทยา';
        const typeIcon = isAdvisor ? '👔' : '🩺';
        const modeLabel = a.mode === 'online' ? '🌐 ออนไลน์' : '📍 มาพบตัว';
        const headerColor = isAdvisor ? '#37474F' : '#1565C0';

        return {
            type: 'bubble' as const,
            styles: { header: { backgroundColor: headerColor } },
            header: {
                type: 'box' as const,
                layout: 'vertical' as const,
                paddingAll: 'md' as const,
                contents: [
                    { type: 'text' as const, text: `${typeIcon} ${typeLabel}`, color: '#FFFFFF', weight: 'bold' as const, size: 'sm' as const },
                ],
            },
            body: {
                type: 'box' as const,
                layout: 'vertical' as const,
                spacing: 'sm' as const,
                paddingAll: 'lg' as const,
                contents: [
                    {
                        type: 'box' as const, layout: 'horizontal' as const, spacing: 'sm' as const,
                        contents: [
                            { type: 'text' as const, text: '📆', size: 'sm' as const, flex: 0 },
                            { type: 'text' as const, text: dateStr, size: 'sm' as const, flex: 1, wrap: true },
                        ],
                    },
                    {
                        type: 'box' as const, layout: 'horizontal' as const, spacing: 'sm' as const,
                        contents: [
                            { type: 'text' as const, text: '⏰', size: 'sm' as const, flex: 0 },
                            { type: 'text' as const, text: timeStr, size: 'sm' as const, flex: 1, weight: 'bold' as const },
                        ],
                    },
                    {
                        type: 'box' as const, layout: 'horizontal' as const, spacing: 'sm' as const, margin: 'sm' as const,
                        contents: [
                            { type: 'text' as const, text: modeLabel, size: 'xs' as const, color: '#888888', flex: 1 },
                        ],
                    },
                ],
            },
            footer: {
                type: 'box' as const,
                layout: 'vertical' as const,
                paddingAll: 'md' as const,
                contents: [
                    {
                        type: 'button' as const,
                        action: {
                            type: 'postback' as const,
                            label: '❌ ยกเลิกนัดหมาย',
                            data: `action=cancel_appt&appt_id=${a.id}&appt_type=${a.type}`,
                        },
                        style: 'link' as const,
                        color: '#E53935',
                        height: 'sm' as const,
                    },
                ],
            },
        };
    });

    return {
        type: 'flex',
        altText: `📅 นัดหมายของคุณ (${appts.length} รายการ)`,
        contents: { type: 'carousel', contents: bubbles },
    };
}

// ─── Resources Carousel Message ───
// Category-colored card carousel for self-help resources

export function buildResourcesMessage(resources: ResourceItem[]): messagingApi.FlexMessage {
    const categoryColor: Record<string, string> = {
        'สุขภาพจิต': '#2E7D32',
        'การเรียน': '#1565C0',
        'ความเครียด': '#E65100',
        'ความสัมพันธ์': '#AD1457',
        'ฉุกเฉิน': '#B71C1C',
        'ทั่วไป': '#37474F',
    };

    const bubbles = resources.map((r) => {
        const color = categoryColor[r.category] ?? '#455A64';
        const bodyContents: any[] = [
            { type: 'text', text: r.title, weight: 'bold', size: 'sm', wrap: true },
        ];
        if (r.description) {
            bodyContents.push({ type: 'text', text: r.description, size: 'xs', color: '#666666', wrap: true, margin: 'sm' });
        }

        return {
            type: 'bubble' as const,
            styles: { header: { backgroundColor: color } },
            header: {
                type: 'box' as const,
                layout: 'vertical' as const,
                paddingAll: 'md' as const,
                contents: [
                    { type: 'text' as const, text: r.category.toUpperCase(), color: 'rgba(255,255,255,0.7)', size: 'xxs' as const, letterSpacing: '2px' },
                    { type: 'text' as const, text: r.title, color: '#FFFFFF', weight: 'bold' as const, size: 'sm' as const, wrap: true, margin: 'xs' as const },
                ],
            },
            body: r.description ? {
                type: 'box' as const,
                layout: 'vertical' as const,
                paddingAll: 'lg' as const,
                contents: [
                    { type: 'text' as const, text: r.description, size: 'xs' as const, color: '#666666', wrap: true },
                ],
            } : undefined,
            footer: r.url ? {
                type: 'box' as const,
                layout: 'vertical' as const,
                paddingAll: 'md' as const,
                contents: [
                    {
                        type: 'button' as const,
                        action: { type: 'uri' as const, label: '📖 อ่านเพิ่มเติม', uri: r.url },
                        style: 'primary' as const,
                        color,
                        height: 'sm' as const,
                    },
                ],
            } : undefined,
        };
    });

    return {
        type: 'flex',
        altText: '📚 แหล่งช่วยเหลือตนเอง',
        contents: { type: 'carousel', contents: bubbles },
    };
}

export { client as lineClient };
