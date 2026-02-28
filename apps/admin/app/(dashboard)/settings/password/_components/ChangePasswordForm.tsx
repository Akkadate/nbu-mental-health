'use client'

import { useState, useTransition } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ChangePasswordForm() {
    const [form, setForm] = useState({ current: '', next: '', confirm: '' })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isPending, startTransition] = useTransition()

    const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-[--color-border] bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500'
    const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

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
        <div className="bg-white rounded-2xl border border-[--color-border] shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <span className="text-red-500 text-base shrink-0 mt-0.5">⚠</span>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <span className="text-green-500 text-base shrink-0 mt-0.5">✓</span>
                        <p className="text-sm text-green-700">เปลี่ยนรหัสผ่านเรียบร้อยแล้ว</p>
                    </div>
                )}

                <div>
                    <label className={labelCls}>รหัสผ่านปัจจุบัน <span className="text-red-500">*</span></label>
                    <input
                        type="password"
                        className={inputCls}
                        placeholder="••••••••"
                        value={form.current}
                        onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                        disabled={isPending}
                        autoComplete="current-password"
                    />
                </div>

                <div className="border-t border-[--color-border] pt-5">
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>
                                รหัสผ่านใหม่ <span className="text-red-500">*</span>
                                <span className="ml-1.5 text-xs font-normal text-gray-400">(อย่างน้อย 8 ตัวอักษร)</span>
                            </label>
                            <input
                                type="password"
                                className={inputCls}
                                placeholder="••••••••"
                                value={form.next}
                                onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                                disabled={isPending}
                                autoComplete="new-password"
                            />
                        </div>

                        <div>
                            <label className={labelCls}>ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span></label>
                            <input
                                type="password"
                                className={inputCls}
                                placeholder="••••••••"
                                value={form.confirm}
                                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                                disabled={isPending}
                                autoComplete="new-password"
                            />
                            {form.confirm && form.next && form.confirm !== form.next && (
                                <p className="mt-1.5 text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
                            )}
                            {form.confirm && form.next && form.confirm === form.next && (
                                <p className="mt-1.5 text-xs text-green-600">✓ รหัสผ่านตรงกัน</p>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
            </form>
        </div>
    )
}
