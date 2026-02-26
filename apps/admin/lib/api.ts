import { getToken } from './auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

type FetchOptions = Omit<RequestInit, 'headers'> & {
    headers?: Record<string, string>
}

/**
 * Server-side fetch wrapper with automatic JWT auth header injection.
 * Uses getToken() which reads the httpOnly cookie on the server.
 */
async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const token = await getToken()

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next: { revalidate: 0 }, // No caching for auth'd requests by default
    } as any)

    if (!res.ok) {
        const errorBody = await res.text().catch(() => 'Unknown error')
        throw new ApiError(res.status, errorBody)
    }

    return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function loginApi(email: string, password: string) {
    return apiFetch<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    })
}

export function getMeApi() {
    return apiFetch<{ id: string; role: string; name: string; email: string }>('/me')
}

// ── Advisory ──────────────────────────────────────────────────────────────────

export interface Appointment {
    id: string
    studentCode: string
    studentName: string
    advisorId: string
    scheduledAt: string
    mode: 'online' | 'onsite'
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
    createdAt: string
}

export interface Slot {
    id: string
    advisor_id?: string
    counselor_id?: string
    start_at: string
    end_at: string
    is_available: boolean
}

export function getAdvisoryAppointmentsApi(from?: string, to?: string) {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiFetch<Appointment[]>(`/advisory/appointments?${params.toString()}`)
}

export function updateAdvisoryAppointmentApi(id: string, data: Partial<Pick<Appointment, 'status'>>) {
    return apiFetch<Appointment>(`/advisory/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    })
}

export function getAdvisorySlotsApi() {
    return apiFetch<Slot[]>('/advisory/slots')
}

export function createAdvisorySlotApi(data: { startAt: string; endAt: string }) {
    return apiFetch<Slot>('/advisory/slots', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export function deleteAdvisorySlotApi(id: string) {
    return apiFetch<void>(`/advisory/slots/${id}`, { method: 'DELETE' })
}

// ── Counselor / Clinical ──────────────────────────────────────────────────────

export interface Case {
    id: string
    studentCode: string
    priority: 'high' | 'crisis'
    status: 'open' | 'acked' | 'contacted' | 'follow_up' | 'closed'
    assignedCounselorId: string | null
    latestScreeningId: string | null
    ackedAt: string | null
    closedAt: string | null
    createdAt: string
}

export function getCasesApi(status?: string) {
    const params = status ? `?status=${status}` : ''
    return apiFetch<Case[]>(`/clinical/cases${params}`)
}

export function getCaseByIdApi(id: string) {
    return apiFetch<Case>(`/clinical/cases/${id}`)
}

export function ackCaseApi(id: string) {
    return apiFetch<Case>(`/clinical/cases/${id}/ack`, { method: 'POST' })
}

export function addCaseNoteApi(caseId: string, noteText: string) {
    return apiFetch<{ id: string }>('/clinical/case-notes', {
        method: 'POST',
        body: JSON.stringify({ caseId, noteText }),
    })
}

export function getClinicalAppointmentsApi() {
    return apiFetch<Appointment[]>('/clinical/appointments')
}

export function getClinicalSlotsApi() {
    return apiFetch<Slot[]>('/clinical/slots')
}

export function createClinicalSlotApi(data: { startAt: string; endAt: string }) {
    return apiFetch<Slot>('/clinical/slots', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
    totalScreenings: number
    riskLow: number
    riskModerate: number
    riskHigh: number
    riskCrisis: number
    advisorAppointments: number
    counselorAppointments: number
    openCases: number
}

export interface FacultyHeatmapRow {
    faculty: string
    low: number
    moderate: number
    high: number
    crisis: number
}

export function getAnalyticsOverviewApi(from?: string, to?: string) {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiFetch<AnalyticsOverview>(`/analytics/overview?${params.toString()}`)
}

export function getFacultyHeatmapApi(date?: string) {
    const params = date ? `?date=${date}` : ''
    return apiFetch<FacultyHeatmapRow[]>(`/analytics/faculty-heatmap${params}`)
}

// ── Students ──────────────────────────────────────────────────────

export interface Student {
    id: string
    student_code: string
    faculty: string
    year: number
    status: 'active' | 'inactive'
    created_at: string
    line_user_id: string | null
    linked_at: string | null
}

export interface StudentsResponse {
    data: Student[]
    total: number
    page: number
    limit: number
}

export function getStudentsApi(params?: {
    search?: string
    faculty?: string
    linked?: 'yes' | 'no'
    page?: number
    limit?: number
}) {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.faculty) q.set('faculty', params.faculty)
    if (params?.linked) q.set('linked', params.linked)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    return apiFetch<StudentsResponse>(`/students?${q.toString()}`)
}

export function getStudentFacultiesApi() {
    return apiFetch<string[]>('/students/faculties')
}

export function updateStudentApi(id: string, data: Partial<Pick<Student, 'faculty' | 'year' | 'status'>>) {
    return apiFetch<Student>(`/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    })
}

export function deleteStudentApi(id: string) {
    return apiFetch<void>(`/students/${id}`, { method: 'DELETE' })
}

export function importStudentsApi(csv: string) {
    return apiFetch<{ inserted: number; updated: number; errors: string[] }>('/students/import', {
        method: 'POST',
        body: JSON.stringify({ csv }),
    })
}

// ── Resources ────────────────────────────────────────────────────

export interface Resource {
    id: string
    category: string
    title: string
    url: string | null
    content_markdown: string | null
    tags: string[]
    is_active: boolean
    created_at: string
    updated_at: string
}

export function getResourcesApi() {
    return apiFetch<Resource[]>('/resources')
}

export function createResourceApi(data: Pick<Resource, 'category' | 'title' | 'url' | 'content_markdown' | 'tags'>) {
    return apiFetch<Resource>('/resources', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export function updateResourceApi(id: string, data: Partial<Omit<Resource, 'id' | 'created_at' | 'updated_at'>>) {
    return apiFetch<Resource>(`/resources/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    })
}

export function deleteResourceApi(id: string) {
    return apiFetch<void>(`/resources/${id}`, { method: 'DELETE' })
}

// ── Users (Staff Management) ──────────────────────────────────────

export interface StaffUser {
    id: string
    role: 'advisor' | 'counselor' | 'admin'
    email: string
    name: string
    faculty: string | null
    line_user_id: string | null
    is_active: boolean
    created_at: string
}

export function getStaffUsersApi() {
    return apiFetch<StaffUser[]>('/auth/users')
}

export function createStaffUserApi(data: { email: string; password: string; role: StaffUser['role']; name: string; faculty?: string }) {
    return apiFetch<StaffUser>('/auth/users', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export function updateStaffUserApi(id: string, data: Partial<Pick<StaffUser, 'name' | 'faculty'>>) {
    return apiFetch<StaffUser>(`/auth/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    })
}

export function deleteStaffUserApi(id: string) {
    return apiFetch<void>(`/auth/users/${id}`, { method: 'DELETE' })
}

export function deleteClinicalSlotApi(id: string) {
    return apiFetch<void>(`/clinical/slots/${id}`, { method: 'DELETE' })
}

export function updateClinicalAppointmentApi(id: string, data: Partial<Pick<Appointment, 'status'>>) {
    return apiFetch<Appointment>(`/clinical/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    })
}
