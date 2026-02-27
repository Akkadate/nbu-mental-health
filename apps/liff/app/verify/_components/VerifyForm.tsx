'use client'

import { useState, useTransition } from 'react'
import { useLiff } from '../../_components/LiffProvider'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type DocType = 'national_id' | 'passport'
type Lang = 'th' | 'en'

// ── i18n ──────────────────────────────────────────────────────────────────────
const i18n = {
    th: {
        title: 'ยืนยันตัวตน',
        subtitle: 'เชื่อมต่อบัญชี LINE กับรหัสนักศึกษา',
        studentCode: 'รหัสนักศึกษา',
        studentCodePlaceholder: '6xxxxxxxx',
        dob: 'วันเกิด',
        docType: 'ประเภทเอกสาร',
        nationalId: 'บัตรประชาชน / บัตรชมพู',
        passport: 'Passport',
        idCardLabel: 'เลขบัตรประชาชน (13 หลัก ไม่ต้องมีขีด)',
        passportLabel: 'เลขหนังสือเดินทาง',
        idCardPlaceholder: '1234567890123',
        passportPlaceholder: 'AA1234567',
        digitCount: (n: number) => `${n}/13 หลัก`,
        consent: 'ฉันยินยอมให้มหาวิทยาลัยนอร์ทกรุงเทพเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลเพื่อจุดประสงค์ด้านการดูแลสุขภาพจิต',
        submit: '🔐 ยืนยันตัวตน',
        submitting: 'กำลังยืนยัน...',
        successTitle: 'ยืนยันตัวตนสำเร็จ',
        successMsg: 'บัญชี LINE ของคุณถูกเชื่อมต่อกับระบบ NBU แล้ว',
        successClose: 'ปิดหน้าต่างนี้เพื่อกลับไปยัง LINE ได้เลย',
        errorConsent: 'กรุณายอมรับเงื่อนไขการใช้งาน',
        errorData: 'ข้อมูลไม่ถูกต้องหรือไม่พบในระบบ กรุณาตรวจสอบและลองใหม่',
        errorGeneric: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    },
    en: {
        title: 'Identity Verification',
        subtitle: 'Link your LINE account with your Student ID',
        studentCode: 'Student ID',
        studentCodePlaceholder: '6xxxxxxxx',
        dob: 'Date of Birth',
        docType: 'Document Type',
        nationalId: 'National ID / Pink Card',
        passport: 'Passport',
        idCardLabel: 'National ID Number (13 digits, no dashes)',
        passportLabel: 'Passport Number',
        idCardPlaceholder: '1234567890123',
        passportPlaceholder: 'AA1234567',
        digitCount: (n: number) => `${n}/13 digits`,
        consent: 'I consent to North Bangkok University collecting and using my personal data for mental health support purposes.',
        submit: '🔐 Verify Identity',
        submitting: 'Verifying...',
        successTitle: 'Verification Successful',
        successMsg: 'Your LINE account has been linked to the NBU system.',
        successClose: 'You may close this window to return to LINE.',
        errorConsent: 'Please accept the terms of use.',
        errorData: 'Invalid information or student not found. Please check and try again.',
        errorGeneric: 'An error occurred. Please try again.',
    },
} as const

// ── Input class — font-size 16px prevents iOS Safari zoom ────────────────────
const inputCls = [
    'block w-full min-w-0',
    'border border-gray-300 rounded-xl px-4 py-3',
    'text-[16px] leading-tight',   // ← 16px prevents iOS auto-zoom
    'focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:border-[#06C755]',
    'bg-white',
].join(' ')

export default function VerifyForm() {
    const { profile, accessToken } = useLiff()
    const [lang, setLang] = useState<Lang>('th')
    const t = i18n[lang]

    const [form, setForm] = useState({
        studentCode: '',
        dob: '',
        docType: 'national_id' as DocType,
        docNumber: '',
        consent: false,
    })
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.consent) {
            setErrorMsg(t.errorConsent)
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
                    setErrorMsg(t.errorData)
                    setStatus('error')
                    return
                }
                setStatus('success')
            } catch {
                setErrorMsg(t.errorGeneric)
                setStatus('error')
            }
        })
    }

    // ── Success screen ────────────────────────────────────────────────────────
    if (status === 'success') {
        return (
            <div className="max-w-sm mx-auto px-4 py-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">{t.successTitle}</h2>
                <p className="text-sm text-gray-500">{t.successMsg}</p>
                <p className="text-sm text-gray-400 mt-2">{t.successClose}</p>
            </div>
        )
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-sm mx-auto px-4 py-6">

            {/* Header + Language toggle */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="text-3xl mb-1">🔐</div>
                    <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{t.subtitle}</p>
                </div>
                {/* Language toggle */}
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0 mt-1">
                    <button
                        type="button"
                        onClick={() => setLang('th')}
                        style={{ touchAction: 'manipulation' }}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${lang === 'th' ? 'bg-[#06C755] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >TH</button>
                    <button
                        type="button"
                        onClick={() => setLang('en')}
                        style={{ touchAction: 'manipulation' }}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'bg-[#06C755] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >EN</button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Error banner */}
                {status === 'error' && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {errorMsg}
                    </div>
                )}

                {/* Student code */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t.studentCode}
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={form.studentCode}
                        onChange={(e) => setForm({ ...form, studentCode: e.target.value })}
                        placeholder={t.studentCodePlaceholder}
                        className={inputCls}
                    />
                </div>

                {/* DOB */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t.dob}
                    </label>
                    {/* overflow-hidden prevents date picker icon from expanding outside container */}
                    <div className="overflow-hidden rounded-xl">
                        <input
                            type="date"
                            required
                            value={form.dob}
                            onChange={(e) => setForm({ ...form, dob: e.target.value })}
                            className={inputCls}
                            style={{ WebkitAppearance: 'none', appearance: 'none' }}
                        />
                    </div>
                </div>

                {/* Doc type */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t.docType}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['national_id', 'passport'] as DocType[]).map((dt) => {
                            const isActive = form.docType === dt
                            return (
                                <button
                                    key={dt}
                                    type="button"
                                    onClick={() => setForm({ ...form, docType: dt, docNumber: '' })}
                                    style={{ touchAction: 'manipulation' }}
                                    className={[
                                        'flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left',
                                        isActive
                                            ? 'border-[#06C755] bg-[#06C755]/5 text-[#06C755]'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                                    ].join(' ')}
                                >
                                    <span className="text-lg shrink-0">
                                        {dt === 'national_id' ? '🪪' : '🛂'}
                                    </span>
                                    <span className="leading-tight text-xs">
                                        {dt === 'national_id' ? t.nationalId : t.passport}
                                    </span>
                                    {/* Active indicator dot */}
                                    <span className={[
                                        'ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                        isActive ? 'border-[#06C755] bg-[#06C755]' : 'border-gray-300 bg-white',
                                    ].join(' ')}>
                                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Doc number */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {form.docType === 'national_id' ? t.idCardLabel : t.passportLabel}
                    </label>
                    <input
                        type="text"
                        inputMode={form.docType === 'national_id' ? 'numeric' : 'text'}
                        required
                        value={form.docNumber}
                        onChange={(e) => {
                            const v = form.docType === 'national_id'
                                ? e.target.value.replace(/\D/g, '').slice(0, 13)
                                : e.target.value.toUpperCase()
                            setForm({ ...form, docNumber: v })
                        }}
                        placeholder={form.docType === 'national_id' ? t.idCardPlaceholder : t.passportPlaceholder}
                        maxLength={form.docType === 'national_id' ? 13 : 20}
                        className={`${inputCls} font-mono`}
                    />
                    {form.docType === 'national_id' && form.docNumber.length > 0 && (
                        <p className={`text-xs mt-1 ${form.docNumber.length === 13 ? 'text-[#06C755]' : 'text-gray-400'}`}>
                            {t.digitCount(form.docNumber.length)}
                            {form.docNumber.length === 13 && ' ✓'}
                        </p>
                    )}
                </div>

                {/* Consent */}
                <label className="flex items-start gap-3 cursor-pointer" style={{ touchAction: 'manipulation' }}>
                    <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                        className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[#06C755]"
                    />
                    <span className="text-sm text-gray-600 leading-snug">{t.consent}</span>
                </label>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isPending}
                    style={{ touchAction: 'manipulation', backgroundColor: '#06C755' }}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-60"
                >
                    {isPending ? t.submitting : t.submit}
                </button>

            </form>
        </div>
    )
}
