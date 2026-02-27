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

export { client as lineClient };
