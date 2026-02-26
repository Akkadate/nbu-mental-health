// ─── Enums (matching PostgreSQL enum types) ───

export const Role = {
    STUDENT: 'student',
    ADVISOR: 'advisor',
    COUNSELOR: 'counselor',
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const RiskLevel = {
    LOW: 'low',
    MODERATE: 'moderate',
    HIGH: 'high',
    CRISIS: 'crisis',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const ApptStatus = {
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no_show',
} as const;
export type ApptStatus = (typeof ApptStatus)[keyof typeof ApptStatus];

export const CaseStatus = {
    OPEN: 'open',
    ACKED: 'acked',
    CONTACTED: 'contacted',
    FOLLOW_UP: 'follow_up',
    CLOSED: 'closed',
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const Priority = {
    HIGH: 'high',
    CRISIS: 'crisis',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const Mode = {
    ONLINE: 'online',
    ONSITE: 'onsite',
} as const;
export type Mode = (typeof Mode)[keyof typeof Mode];

export const VerifyDocType = {
    NATIONAL_ID: 'national_id',
    PASSPORT: 'passport',
} as const;
export type VerifyDocType = (typeof VerifyDocType)[keyof typeof VerifyDocType];

export const ScreeningType = {
    STRESS_MINI: 'stress_mini',
    PHQ9_GAD7: 'phq9_gad7',
} as const;
export type ScreeningType = (typeof ScreeningType)[keyof typeof ScreeningType];

export const Intent = {
    ACADEMIC: 'academic',
    STRESS: 'stress',
    RELATIONSHIP: 'relationship',
    SLEEP: 'sleep',
    OTHER: 'other',
    UNSURE: 'unsure',
} as const;
export type Intent = (typeof Intent)[keyof typeof Intent];

export const JobType = {
    SEND_LINE_MESSAGE: 'send_line_message',
    REMINDER_1D: 'reminder_1d',
    REMINDER_2H: 'reminder_2h',
    ESCALATION_CHECK: 'escalation_check',
    AGGREGATE_ROLLUP: 'aggregate_rollup',
    FOLLOW_UP_NOSHOW: 'follow_up_noshow',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
