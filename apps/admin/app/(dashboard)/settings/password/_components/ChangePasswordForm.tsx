'use client'

import { useState, useTransition } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ChangePasswordForm() {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        if (!form.current || !form.next || !form.confirm) {
            setError('กรุณากรอกข้อมูลให้ครบ')
            return
        }
        if (form.next.length < 8) {
            setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
            return
        }
        if (form.next !== form.confirm) {
            setError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน')
            return
        }

        startTransition(async () => {
            const res = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ current_password: form.current, new_password: form.next }),
            })
            if (res.ok) {
                setForm({ current: '', next: '', confirm: '' })
                setSuccess(true)
            } else {
                const body = await res.json().catch(() => ({}))
                setError(body?.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
            }
        })
    }

    return (
        <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
                {success && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        ✅ เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
                    </p>
                )}

                <div>
                    <label className="label">รหัสผ่านปัจจุบัน *</label>
                    <input
                        type="password"
                        className="input"
                        value={form.current}
                        onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                        disabled={isPending}
                        autoComplete="current-password"
                    />
                </div>

                <div>
                    <label className="label">รหัสผ่านใหม่ * <span className="text-gray-400 font-normal">(อย่างน้อย 8 ตัวอักษร)</span></label>
                    <input
                        type="password"
                        className="input"
                        value={form.next}
                        onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                        disabled={isPending}
                        autoComplete="new-password"
                    />
                </div>

                <div>
                    <label className="label">ยืนยันรหัสผ่านใหม่ *</label>
                    <input
                        type="password"
                        className="input"
                        value={form.confirm}
                        onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                        disabled={isPending}
                        autoComplete="new-password"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary w-full disabled:opacity-50"
                >
                    {isPending ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
            </form>
        </div>
    )
}
