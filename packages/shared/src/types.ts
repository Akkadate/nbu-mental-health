import { z } from 'zod';
import * as schemas from './schemas.js';

// ─── Inferred types from Zod schemas ───

export type LoginRequest = z.infer<typeof schemas.LoginRequest>;
export type LoginResponse = z.infer<typeof schemas.LoginResponse>;

export type LinkLineRequest = z.infer<typeof schemas.LinkLineRequest>;
export type LinkLineResponse = z.infer<typeof schemas.LinkLineResponse>;

export type ScreeningRequest = z.infer<typeof schemas.ScreeningRequest>;
export type ScreeningResponse = z.infer<typeof schemas.ScreeningResponse>;

export type CreateAppointmentRequest = z.infer<typeof schemas.CreateAppointmentRequest>;
export type AppointmentResponse = z.infer<typeof schemas.AppointmentResponse>;

export type CreateSlotRequest = z.infer<typeof schemas.CreateSlotRequest>;
export type SlotResponse = z.infer<typeof schemas.SlotResponse>;

export type CaseResponse = z.infer<typeof schemas.CaseResponse>;
export type CreateCaseNoteRequest = z.infer<typeof schemas.CreateCaseNoteRequest>;

export type ResourceResponse = z.infer<typeof schemas.ResourceResponse>;
export type CreateResourceRequest = z.infer<typeof schemas.CreateResourceRequest>;

export type AnalyticsOverview = z.infer<typeof schemas.AnalyticsOverview>;

// ─── Additional utility types ───

export interface JwtPayload {
    sub: string;       // user.id
    role: string;      // user.role
    iat: number;
    exp: number;
}

export interface AuthenticatedRequest {
    user: {
        id: string;
        role: string;
    };
}

export interface LineEvent {
    type: string;
    timestamp: number;
    source: {
        type: string;
        userId?: string;
    };
    replyToken?: string;
    message?: {
        type: string;
        id: string;
        text?: string;
    };
    postback?: {
        data: string;
    };
}
