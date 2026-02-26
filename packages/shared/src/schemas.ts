import { z } from 'zod';

// ─── Auth ───

export const LoginRequest = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const LoginResponse = z.object({
    token: z.string(),
    user: z.object({
        id: z.string().uuid(),
        role: z.enum(['student', 'advisor', 'counselor', 'admin', 'supervisor']),
        email: z.string().email().nullable(),
    }),
});

// ─── Student Link LINE ───

export const LinkLineRequest = z.object({
    student_code: z.string().min(4).max(32),
    verify_doc_type: z.enum(['national_id', 'passport']),
    verify_token: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
    verify_doc_number: z.string().min(5).max(20),
    line_user_id: z.string().min(1).max(64),
});

export const LinkLineResponse = z.object({
    linked: z.boolean(),
    student_id: z.string().uuid(),
});

// ─── Screening ───

export const ScreeningRequest = z.object({
    student_id: z.string().uuid(),
    type: z.enum(['stress_mini', 'phq9_gad7']),
    intent: z.enum([
        'academic',
        'stress',
        'relationship',
        'sleep',
        'other',
        'unsure',
    ]),
    answers: z.record(z.string(), z.array(z.number().int().min(0).max(3))),
});

export const ScreeningResponse = z.object({
    id: z.string().uuid(),
    risk_level: z.enum(['low', 'moderate', 'high', 'crisis']),
    phq9_score: z.number().nullable(),
    gad7_score: z.number().nullable(),
    stress_score: z.number().nullable(),
    routing_suggestion: z.string(),
    case_id: z.string().uuid().nullable(),
});

// ─── Appointment / Booking ───

export const CreateAppointmentRequest = z.object({
    student_id: z.string().uuid(),
    type: z.enum(['advisor', 'counselor']),
    slot_id: z.string().uuid(),
    mode: z.enum(['online', 'onsite']),
});

export const AppointmentResponse = z.object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    type: z.enum(['advisor', 'counselor']),
    scheduled_at: z.string(),
    mode: z.enum(['online', 'onsite']),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']),
});

// ─── Slots ───

export const CreateSlotRequest = z.object({
    start_at: z.string().datetime(),
    end_at: z.string().datetime(),
});

export const SlotResponse = z.object({
    id: z.string().uuid(),
    start_at: z.string(),
    end_at: z.string(),
    is_available: z.boolean(),
});

// ─── Clinical Cases ───

export const CaseResponse = z.object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    priority: z.enum(['high', 'crisis']),
    status: z.enum(['open', 'acked', 'contacted', 'follow_up', 'closed']),
    assigned_counselor_id: z.string().uuid().nullable(),
    acked_at: z.string().nullable(),
    closed_at: z.string().nullable(),
    created_at: z.string(),
});

export const CreateCaseNoteRequest = z.object({
    case_id: z.string().uuid(),
    note: z.string().min(1).max(10000),
});

// ─── Resources ───

export const ResourceResponse = z.object({
    id: z.string().uuid(),
    category: z.string(),
    title: z.string(),
    url: z.string().url().nullable(),
    content_md: z.string().nullable(),
    tags: z.array(z.string()),
    is_active: z.boolean(),
});

export const CreateResourceRequest = z.object({
    category: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url().optional(),
    content_md: z.string().optional(),
    tags: z.array(z.string()).default([]),
    is_active: z.boolean().default(true),
});

// ─── Analytics ───

export const AnalyticsOverview = z.object({
    period: z.object({ from: z.string(), to: z.string() }),
    totals: z.object({
        screenings: z.number(),
        risk_low: z.number(),
        risk_moderate: z.number(),
        risk_high: z.number(),
        risk_crisis: z.number(),
        advisor_appointments: z.number(),
        counselor_appointments: z.number(),
    }),
    by_faculty: z.array(
        z.object({
            faculty: z.string(),
            risk_low: z.number(),
            risk_moderate: z.number(),
            risk_high: z.number(),
            risk_crisis: z.number(),
        })
    ),
});

// ─── LINE Webhook (internal, not exposed via API) ───

export const LineWebhookBody = z.object({
    destination: z.string(),
    events: z.array(
        z.object({
            type: z.string(),
            timestamp: z.number(),
            source: z.object({
                type: z.string(),
                userId: z.string().optional(),
            }),
            replyToken: z.string().optional(),
            message: z
                .object({
                    type: z.string(),
                    id: z.string(),
                    text: z.string().optional(),
                })
                .optional(),
            postback: z
                .object({
                    data: z.string(),
                })
                .optional(),
        })
    ),
});
