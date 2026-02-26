'use client'

import { useState, useTransition } from 'react'
import type { StaffUser } from '../../../../../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const LIFF_LINK_STAFF_ID = process.env.NEXT_PUBLIC_LIFF_LINK_STAFF_ID ?? ''

const ROLE_LABELS: Record<string, string> = {
    advisor: 'อาจารย์ที่ปรึกษา',
    counselor: 'นักจิตวิทยา',
    admin: 'ผู้ดูแลระบบ',
}

const ROLE_COLORS: Record<string, string> = {
    advisor: 'bg-blue-50 text-blue-700 border-blue-200',
    counselor: 'bg-purple-50 text-purple-700 border-purple-200',
    admin: 'bg-orange-50 text-orange-700 border-orange-200',
}

interface Props {
    initialUsers: StaffUser[]
}

const emptyForm = { email: '', password: '', name: '', role: 'advisor' as StaffUser['role'], faculty: '' }

export default function UserTable({ initialUsers }: Props) {
    const [users, setUsers] = useState<StaffUser[]>(initialUsers)
    const [showForm, setShowForm] = useState(false)
    const [showLineInstructions, setShowLineInstructions] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [filterRole, setFilterRole] = useState<string>('all')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const filtered = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole)

    const linkedCount = users.filter((u) => u.line_user_id).length
    const needsLineCount = users.filter((u) => !u.line_user_id && u.role !== 'admin').length

    const openCreate = () => {
        setForm(emptyForm)
        setError(null)
        setShowForm(true)
    }

    const handleSubmit = () => {
        if (!form.email.trim() || !form.password.trim() || !form.name.trim()) {
            setError('กรุณากรอกข้อมูลให้ครบ (อีเมล, รหัสผ่าน, ชื่อ)')
            return
        }
        startTransition(async () => {
            const payload = {
                email: form.email.trim(),
                password: form.password,
                name: form.name.trim(),
                role: form.role,
                faculty: form.faculty.trim() || undefined,
            }
            const res = await fetch(`${API_BASE}/auth/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            })
            if (res.status === 409) { setError('อีเมลนี้ถูกใช้งานแล้ว'); return }
            if (!res.ok) { setError('บันทึกไม่สำเร็จ กรุณาลองใหม่'); return }
            const data: StaffUser = await res.json()
            setUsers((prev) => [data, ...prev])
            setShowForm(false)
            setForm(emptyForm)
            // Auto-show LINE instructions after creating counselor/advisor
            if (data.role !== 'admin') setShowLineInstructions(true)
        })
    }

    const handleDeactivate = (id: string, name: string) => {
        if (!confirm(`ยืนยันการปิดใช้งานบัญชี "${name}"?\nผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้อีก`)) return
        startTransition(async () => {
            const res = await fetch(`${API_BASE}/auth/users/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            if (res.ok) {
                setUsers((prev) => prev.filter((u) => u.id !== id))
            }
        })
    }

    const liffUrl = LIFF_LINK_STAFF_ID ? `https://liff.line.me/${LIFF_LINK_STAFF_ID}` : null

    return (
        <div className="space-y-4">
            {/* LINE Status Summary */}
            {needsLineCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-800">
                            พนักงาน {needsLineCount} คนยังไม่ได้เชื่อม LINE
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            ต้องเชื่อม LINE เพื่อรับแจ้งเตือนเมื่อมีเคสใหม่
                        </p>
                        <button
                            onClick={() => setShowLineInstructions(true)}
                            className="text-xs text-amber-800 underline mt-1"
                        >
                            ดูวิธีเชื่อม LINE →
                        </button>
                    </div>
                    <span className="text-xs text-amber-600 shrink-0">{linkedCount}/{users.length} เชื่อมแล้ว</span>
                </div>
            )}

            {/* Filter + Add */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {['all', 'advisor', 'counselor', 'admin'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setFilterRole(r)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterRole === r
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                                }`}
                        >
                            {r === 'all' ? 'ทั้งหมด' : ROLE_LABELS[r]}
                        </button>
                    ))}
                </div>
                <button onClick={openCreate} className="btn-primary text-sm">
                    + เพิ่มบัญชีพนักงาน
                </button>
            </div>

            {/* LINE Instructions Modal */}
            {showLineInstructions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-base font-bold text-gray-900">วิธีเชื่อม LINE สำหรับพนักงาน</h2>
                        <div className="space-y-3 text-sm text-gray-700">
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                <p>เพิ่มเพื่อน LINE OA ของระบบ (ถ้ายังไม่ได้เพิ่ม)</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                <p>เปิดลิงก์ด้านล่างใน LINE แล้วล็อกอินด้วยอีเมล/รหัสผ่านที่ได้รับ</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                <p>หลังจากเชื่อมสำเร็จ จะรับแจ้งเตือนผ่าน LINE เมื่อมีเคสใหม่</p>
                            </div>
                        </div>
                        {liffUrl ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 mb-1">ลิงก์เชื่อม LINE (ส่งให้พนักงานเปิดใน LINE)</p>
                                <p className="text-xs font-mono text-brand-700 break-all select-all">{liffUrl}</p>
                            </div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <p className="text-xs text-amber-700">
                                    ยังไม่ได้ตั้งค่า <code>NEXT_PUBLIC_LIFF_LINK_STAFF_ID</code> ใน .env
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-gray-500">
                            หรือพนักงานพิมพ์ <code className="bg-gray-100 px-1 rounded">/myid</code> ใน LINE เพื่อดู User ID ของตนเอง
                        </p>
                        <button onClick={() => setShowLineInstructions(false)} className="btn-secondary w-full">
                            ปิด
                        </button>
                    </div>
                </div>
            )}

            {/* Create Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-base font-bold text-gray-900">เพิ่มบัญชีพนักงาน</h2>
                        {error && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                        )}
                        <div className="space-y-3">
                            <div>
                                <label className="label">ตำแหน่ง *</label>
                                <select
                                    className="input"
                                    value={form.role}
                                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffUser['role'] }))}
                                >
                                    <option value="advisor">อาจารย์ที่ปรึกษา</option>
                                    <option value="counselor">นักจิตวิทยา</option>
                                    <option value="admin">ผู้ดูแลระบบ</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">ชื่อ-นามสกุล *</label>
                                <input
                                    className="input"
                                    placeholder="เช่น อาจารย์สมชาย ใจดี"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="label">อีเมล *</label>
                                <input
                                    className="input"
                                    type="email"
                                    placeholder="staff@nbu.ac.th"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="label">รหัสผ่านเริ่มต้น *</label>
                                <input
                                    className="input"
                                    type="password"
                                    placeholder="อย่างน้อย 8 ตัวอักษร"
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                />
                            </div>
                            {form.role === 'advisor' && (
                                <div>
                                    <label className="label">คณะ</label>
                                    <input
                                        className="input"
                                        placeholder="เช่น คณะวิศวกรรมศาสตร์"
                                        value={form.faculty}
                                        onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))}
                                    />
                                </div>
                            )}
                        </div>
                        {form.role !== 'admin' && (
                            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                หลังสร้างบัญชีแล้ว พนักงานต้องเชื่อม LINE เพื่อรับแจ้งเตือนเคส
                            </p>
                        )}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={isPending}
                                className="btn-primary flex-1 disabled:opacity-50"
                            >
                                {isPending ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
                            </button>
                            <button
                                onClick={() => { setShowForm(false); setError(null) }}
                                className="btn-secondary flex-1"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="card py-16 text-center text-gray-400">
                    <p className="text-sm">ยังไม่มีบัญชีพนักงานในกลุ่มนี้</p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden divide-y divide-[--color-border]">
                    {filtered.map((u) => (
                        <div key={u.id} className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50/50">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {u.name.charAt(0)}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                {u.faculty && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{u.faculty}</p>
                                )}
                            </div>
                            {/* Role badge */}
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border shrink-0 ${ROLE_COLORS[u.role]}`}>
                                {ROLE_LABELS[u.role]}
                            </span>
                            {/* LINE badge — only for non-admin */}
                            {u.role !== 'admin' && (
                                <span
                                    title={u.line_user_id ? `LINE ID: ${u.line_user_id}` : 'ยังไม่ได้เชื่อม LINE — ให้พนักงานเปิด LIFF /link-staff'}
                                    className={`text-xs px-2 py-0.5 rounded-full border shrink-0 cursor-help ${u.line_user_id
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-gray-50 text-gray-400 border-gray-200'
                                        }`}
                                >
                                    {u.line_user_id ? '✓ LINE' : 'ไม่มี LINE'}
                                </span>
                            )}
                            {/* Date */}
                            <p className="text-xs text-gray-400 shrink-0 hidden sm:block">
                                {new Date(u.created_at).toLocaleDateString('th-TH', { dateStyle: 'short' })}
                            </p>
                            {/* Deactivate */}
                            <button
                                onClick={() => handleDeactivate(u.id, u.name)}
                                disabled={isPending}
                                className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                            >
                                ปิดใช้งาน
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <button
                onClick={() => setShowLineInstructions(true)}
                className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
            >
                วิธีเชื่อม LINE สำหรับพนักงาน →
            </button>
        </div>
    )
}
