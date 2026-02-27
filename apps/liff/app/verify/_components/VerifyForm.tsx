'use client'

import { useState, useTransition } from 'react'
import { useLiff } from '../../_components/LiffProvider'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type DocType = 'national_id' | 'passport'

interface FormState {
    studentCode: string
    dob: string
    docType: DocType
    docNumber: string
    consent: boolean
}

export default function VerifyForm() {
    const { profile, accessToken } = useLiff()
    const [form, setForm] = useState<FormState>({
        studentCode: '',
        dob: '',
        docType: 'national_id',
        docNumber: '',
        consent: false,
    })
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.consent) {
            setErrorMsg('กรุณายอมรับเงื่อนไขการใช้งาน')
            setStatus('error')
            return
        }

        setStatus('idle')
        startTransition(async () => {
            try {
                const res = await fetch(`${API_BASE}/students/link-line`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: JSON.stringify({
                        student_code: form.studentCode,
                        verify_token: form.dob,
                        verify_doc_type: form.docType,
                        verify_doc_number: form.docNumber,
                        line_user_id: profile?.userId,
                    }),
                })

                if (!res.ok) {
                    setErrorMsg('ข้อมูลไม่ถูกต้องหรือไม่พบในระบบ กรุณาตรวจสอบและลองใหม่')
                    setStatus('error')
                    return
                }

                setStatus('success')
            } catch {
                setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
                setStatus('error')
            }
        })
    }

    if (status === 'success') {
        return (
            <div className="card text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">ยืนยันตัวตนสำเร็จ</h2>
                <p className="text-sm text-gray-500">บัญชี LINE ของคุณถูกเชื่อมต่อกับระบบ NBU แล้ว</p>
                <p className="text-sm text-gray-400 mt-2">ปิดหน้าต่างนี้เพื่อกลับไปยัง LINE ได้เลย</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {errorMsg}
                </div>
            )}

            {/* Student code */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสนักศึกษา</label>
                <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.studentCode}
                    onChange={(e) => setForm({ ...form, studentCode: e.target.value })}
                    placeholder="6xxxxxxxx"
                    className="w-full border border-[--color-border] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[--color-line-green] focus:border-[--color-line-green]"
                />
            </div>

            {/* DOB */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">วันเกิด</label>
                <input
                    type="date"
                    required
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full border border-[--color-border] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[--color-line-green] focus:border-[--color-line-green]"
                />
            </div>

            {/* Doc type */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ประเภทเอกสาร</label>
                <div className="grid grid-cols-2 gap-2">
                    {(['national_id', 'passport'] as DocType[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setForm({ ...form, docType: t })}
                            className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors ${form.docType === t
                                    ? 'bg-[--color-line-green] text-white border-[--color-line-green]'
                                    : 'bg-white text-gray-600 border-[--color-border]'
                                }`}
                        >
                            {t === 'national_id' ? '🪪 บัตรประชาชน' : '🛂 Passport'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Doc number */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {form.docType === 'national_id' ? 'เลขบัตรประชาชน (13 หลัก)' : 'เลขหนังสือเดินทาง'}
                </label>
                <input
                    type="text"
                    inputMode={form.docType === 'national_id' ? 'numeric' : 'text'}
                    required
                    value={form.docNumber}
                    onChange={(e) => {
                        const v = form.docType === 'national_id'
                            ? e.target.value.replace(/\D/g, '').slice(0, 13) // digits only, max 13
                            : e.target.value.toUpperCase()                    // uppercase passport
                        setForm({ ...form, docNumber: v })
                    }}
                    placeholder={form.docType === 'national_id' ? '1234567890123' : 'AA1234567'}
                    maxLength={form.docType === 'national_id' ? 13 : 20}
                    className="w-full border border-[--color-border] rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-[--color-line-green] focus:border-[--color-line-green]"
                />
                {form.docType === 'national_id' && form.docNumber.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                        {form.docNumber.length}/13 หลัก
                    </p>
                )}
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                    className="mt-0.5 w-4 h-4 accent-[--color-line-green]"
                />
                <span className="text-sm text-gray-600">
                    ฉันยินยอมให้มหาวิทยาลัยนอร์ทกรุงเทพเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลเพื่อจุดประสงค์ด้านการดูแลสุขภาพจิต
                </span>
            </label>

            <button
                type="submit"
                disabled={isPending}
                className="btn-line"
            >
                {isPending ? 'กำลังยืนยัน...' : '🔐 ยืนยันตัวตน'}
            </button>
        </form>
    )
}
