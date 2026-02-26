import { cookies } from 'next/headers'

const COOKIE_NAME = 'nbu_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

export interface SessionPayload {
    userId: string
    role: 'advisor' | 'counselor' | 'admin'
    name: string
    email: string
}

/**
 * Set authentication cookie with JWT token.
 * Called from Server Action after successful login.
 */
export async function setSession(token: string): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
    })
}

/**
 * Get raw JWT token from cookie (for API requests).
 */
export async function getToken(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value ?? null
}

/**
 * Clear session cookie (logout).
 */
export async function clearSession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
}

/**
 * Decode JWT payload without verification (trust the API for verification).
 * Used server-side only to read role/user info.
 */
export function decodeToken(token: string): SessionPayload | null {
    try {
        const payload = token.split('.')[1]
        if (!payload) return null
        const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
        return JSON.parse(decoded) as SessionPayload
    } catch {
        return null
    }
}

/**
 * Get the current session from cookie and decode it.
 * Returns null if not authenticated or token is malformed.
 */
export async function getSession(): Promise<SessionPayload | null> {
    const token = await getToken()
    if (!token) return null
    return decodeToken(token)
}
