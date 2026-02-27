import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Resolve .env: try cwd first (dev from monorepo root), then walk up from __dirname
// __dirname in production = apps/api/dist/ → ../../../ = monorepo root
const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
];
const envPath = envCandidates.find(p => existsSync(p));
// override: true forces dotenv to overwrite values already in process.env
// (pm2 may inject stale env vars from its saved configuration)
dotenv.config({ path: envPath, override: true });
console.log(`[config] Loading .env from: ${envPath ?? '(not found — using process.env)'} | cwd=${process.cwd()}`);

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // JWT
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().default('8h'),

    // LINE
    LINE_CHANNEL_SECRET: z.string().min(1),
    LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),

    // LIFF IDs
    LIFF_VERIFY_ID: z.string().default(''),
    LIFF_SCREENING_ID: z.string().default(''),
    LIFF_BOOKING_ID: z.string().default(''),
    LIFF_LINK_STAFF_ID: z.string().default(''),

    // Rich Menu
    RICH_MENU_GUEST_ID: z.string().default(''),
    RICH_MENU_VERIFIED_ID: z.string().default(''),

    // Encryption
    ENCRYPTION_KEY: z.string().min(32),

    // Server
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
}

export const config = loadConfig();
