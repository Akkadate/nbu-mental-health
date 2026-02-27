import db from '../db.js';
import { logger } from '../logger.js';

/**
 * Create a new job in the DB-backed job queue.
 */
export async function createJob(
    type: string,
    payload: Record<string, any>,
    runAt: Date = new Date()
): Promise<string> {
    const [row] = await db('public.jobs')
        .insert({
            type,
            payload: JSON.stringify(payload),
            run_at: runAt,
            status: 'pending',
        })
        .returning('id');

    logger.info({ jobId: row.id, type, runAt }, 'Job created');
    return row.id;
}

/**
 * Create appointment reminder jobs.
 * - 1 day before
 * - 2 hours before
 */
export async function createReminderJobs(
    appointmentId: string,
    studentLineUserId: string,
    scheduledAt: Date
): Promise<void> {
    const oneDayBefore = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
    const twoHoursBefore = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);
    const now = new Date();

    if (oneDayBefore > now) {
        await createJob('reminder_1d', {
            appointment_id: appointmentId,
            line_user_id: studentLineUserId,
        }, oneDayBefore);
    }

    if (twoHoursBefore > now) {
        await createJob('reminder_2h', {
            appointment_id: appointmentId,
            line_user_id: studentLineUserId,
        }, twoHoursBefore);
    }
}

/**
 * Create escalation check job for crisis cases.
 * Runs 30 minutes after case creation.
 */
export async function createEscalationJob(
    caseId: string,
): Promise<void> {
    const thirtyMinutesLater = new Date(Date.now() + 30 * 60 * 1000);

    await createJob('escalation_check', {
        case_id: caseId,
    }, thirtyMinutesLater);
}

/**
 * Create notification job to push message to staff LINE.
 */
export async function createNotifyStaffJob(
    staffLineUserIds: string[],
    caseId: string,
    priority: string
): Promise<void> {
    for (const lineUserId of staffLineUserIds) {
        await createJob('send_line_message', {
            line_user_id: lineUserId,
            message_type: 'staff_notification',
            case_id: caseId,
            priority,
        });
    }
}

/**
 * Create job to push screening result Flex Message to student via LINE.
 */
export async function createScreeningResultJob(
    studentLineUserId: string,
    riskLevel: string,
    routingSuggestion: string,
): Promise<void> {
    const showBookingCTA = riskLevel === 'moderate' || riskLevel === 'high';
    await createJob('send_line_message', {
        line_user_id: studentLineUserId,
        message_type: 'screening_result',
        risk_level: riskLevel,
        routing_suggestion: routingSuggestion,
        show_booking_cta: showBookingCTA,
    });
}
