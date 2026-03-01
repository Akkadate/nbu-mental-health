import db from './db.js';
import { logger } from './logger.js';
import { config } from './config.js';
import { pushMessage, buildStaffNotification, buildScreeningResultMessage, buildSafetyPackMessage } from './services/line-client.js';

const POLL_INTERVAL_MS = 5000;

/**
 * DB-backed job worker.
 * Polls public.jobs for pending jobs and processes them.
 * Run as separate process: `npm run worker`
 */
async function processJobs(): Promise<void> {
    // Atomically fetch and lock one pending job
    const [job] = await db('public.jobs')
        .where('status', 'pending')
        .where('run_at', '<=', new Date())
        .orderBy('run_at', 'asc')
        .limit(1)
        .update({ status: 'running' })
        .returning('*');

    if (!job) return;

    try {
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

        switch (job.type) {
            case 'send_line_message':
                await handleSendLineMessage(payload);
                break;

            case 'reminder_1d':
            case 'reminder_2h':
                await handleReminder(job.type, payload);
                break;

            case 'escalation_check':
                await handleEscalationCheck(payload);
                break;

            case 'aggregate_rollup':
                await handleAggregateRollup(payload);
                break;

            default:
                logger.warn({ type: job.type }, 'Unknown job type');
        }

        await db('public.jobs')
            .where({ id: job.id })
            .update({ status: 'success' });

        logger.info({ jobId: job.id, type: job.type }, 'Job completed');
    } catch (err) {
        const retryCount = (job.retry_count || 0) + 1;
        const maxRetries = 3;

        await db('public.jobs')
            .where({ id: job.id })
            .update({
                status: retryCount >= maxRetries ? 'failed' : 'pending',
                retry_count: retryCount,
                last_error: (err as Error).message,
                // Exponential backoff: 30s, 2min, 8min
                run_at: retryCount < maxRetries
                    ? new Date(Date.now() + Math.pow(4, retryCount) * 30000)
                    : undefined,
            });

        logger.error({ err, jobId: job.id, retryCount }, 'Job failed');
    }
}

// ─── Job Handlers ───

async function handleSendLineMessage(payload: any): Promise<void> {
    const { line_user_id, message_type, case_id, priority } = payload;

    if (message_type === 'staff_notification') {
        const dashboardUrl = `${config.ADMIN_URL}/counselor/cases/${case_id}`;
        await pushMessage(line_user_id, [
            buildStaffNotification(case_id, priority, dashboardUrl),
        ]);
        return;
    }

    if (message_type === 'screening_result') {
        const { risk_level, routing_suggestion, show_booking_cta } = payload;
        const messages: any[] = [
            buildScreeningResultMessage(risk_level, routing_suggestion, show_booking_cta),
        ];
        // For CRISIS, append safety pack as a second bubble
        if (risk_level === 'crisis') {
            messages.push(buildSafetyPackMessage());
        }
        await pushMessage(line_user_id, messages);
    }
}

async function handleReminder(type: string, payload: any): Promise<void> {
    const { appointment_id, line_user_id } = payload;

    // Check appointment still scheduled
    let appt = await db('advisory.appointments').where({ id: appointment_id, status: 'scheduled' }).first();
    if (!appt) {
        appt = await db('clinical.appointments').where({ id: appointment_id, status: 'scheduled' }).first();
    }
    if (!appt) return; // Cancelled or completed

    const dt = new Date(appt.scheduled_at);
    const dateStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const timeStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const period = type === 'reminder_1d' ? 'พรุ่งนี้' : 'อีก 2 ชั่วโมง';

    await pushMessage(line_user_id, [{
        type: 'text',
        text: `⏰ เตือนนัดหมาย — ${period}\n\n📆 ${dateStr} เวลา ${timeStr}\n📍 ${appt.mode === 'online' ? 'ออนไลน์' : 'มาพบตัว'}\n\nหากต้องการยกเลิก กรุณาติดต่อล่วงหน้า`,
    }]);
}

async function handleEscalationCheck(payload: any): Promise<void> {
    const { case_id } = payload;

    const caseRecord = await db('clinical.cases').where({ id: case_id }).first();
    if (!caseRecord || caseRecord.status !== 'open') return; // Already acknowledged

    // Escalate: notify supervisor
    logger.warn({ caseId: case_id }, 'CRISIS case not acknowledged within 30 minutes — escalating');

    // Find supervisor LINE IDs (stored directly in public.users.line_user_id)
    const supervisors = await db('public.users')
        .where({ role: 'supervisor', is_active: true })
        .whereNotNull('line_user_id')
        .select('line_user_id');

    for (const sup of supervisors) {
        const dashboardUrl = `${config.ADMIN_URL}/counselor/cases/${case_id}`;
        if (sup.line_user_id) {
            await pushMessage(sup.line_user_id, [{
                type: 'flex',
                altText: `⚠️ Escalation Alert — Case ${case_id}`,
                contents: {
                    type: 'bubble',
                    styles: { body: { backgroundColor: '#FFEBEE' } },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '⚠️ Escalation Alert', weight: 'bold', size: 'lg', color: '#D32F2F' },
                            { type: 'text', text: `Case ${case_id} ยังไม่ถูก ACK ภายใน 30 นาที`, wrap: true, margin: 'md', size: 'sm' },
                            { type: 'text', text: 'กรุณาดำเนินการทันที', margin: 'md', size: 'sm', weight: 'bold' },
                        ],
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [{
                            type: 'button',
                            action: { type: 'uri', label: '🔗 เปิด Dashboard', uri: dashboardUrl },
                            style: 'primary',
                            color: '#D32F2F',
                        }],
                    },
                },
            }]);
        }
    }
}

async function handleAggregateRollup(payload: any): Promise<void> {
    const { faculty, risk_level, date } = payload;

    // Upsert daily metric
    const existing = await db('analytics.daily_metrics')
        .where({ metric_date: date, faculty })
        .first();

    const fieldMap: Record<string, string> = {
        low: 'risk_low_count',
        moderate: 'risk_mod_count',
        high: 'risk_high_count',
        crisis: 'risk_crisis_count',
    };
    const field = fieldMap[risk_level];

    if (!field) return;

    if (existing) {
        await db('analytics.daily_metrics')
            .where({ metric_date: date, faculty })
            .increment(field, 1);
    } else {
        await db('analytics.daily_metrics').insert({
            metric_date: date,
            faculty,
            [field]: 1,
            risk_low_count: 0,
            risk_mod_count: 0,
            risk_high_count: 0,
            risk_crisis_count: 0,
            advisor_appt_count: 0,
            counselor_appt_count: 0,
        });
    }
}

// ─── Main Loop ───

async function main(): Promise<void> {
    logger.info('🔧 Worker started — polling for jobs');

    while (true) {
        try {
            await processJobs();
        } catch (err) {
            logger.error({ err }, 'Worker loop error');
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}

main().catch((err) => {
    logger.error({ err }, 'Worker fatal error');
    process.exit(1);
});
