'use client'

import { useState } from 'react'
import liff from '@line/liff'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function StaffLinkForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [status, setStatus] = useState<Status>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !password) {
            setErrorMsg('กรุณากรอกอีเมลและรหัสผ่าน')
            return
        }

        setStatus('loading')
        setErrorMsg('')

        try {
            // Get LINE access token from LIFF SDK
            const accessToken = liff.getAccessToken()
            if (!accessToken) {
                setErrorMsg('ไม่สามารถรับ LINE Token ได้ กรุณาเปิดหน้านี้ใน LINE')
                setStatus('error')
                return
            }

            const res = await fetch(`${API_BASE}/auth/link-line-staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    line_access_token: accessToken,
                    email: email.trim(),
                    password,
                }),
            })

            if (res.status === 401) {
                setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
                setStatus('error')
                return
            }
            if (res.status === 409) {
                setErrorMsg('LINE นี้ถูกเชื่อมกับบัญชีอื่นแล้ว')
                setStatus('error')
                return
            }
            if (!res.ok) {
                setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่')
                setStatus('error')
                return
            }

            setStatus('success')
            // Close LIFF after 2 seconds
            setTimeout(() => {
                if (liff.isInClient()) liff.closeWindow()
            }, 2500)
        } catch {
            setErrorMsg('ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต')
            setStatus('error')
        }
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[--color-bg]">
                <div className="w-full max-w-sm text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-lg font-bold text-gray-900">เชื่อม LINE สำเร็จ!</h1>
                    <p className="text-sm text-gray-600">
                        คุณจะได้รับแจ้งเตือนผ่าน LINE<br />เมื่อมีเคสใหม่เข้ามา
                    </p>
                    <p className="text-xs text-gray-400">หน้าต่างนี้จะปิดอัตโนมัติ...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[--color-bg]">
            <div className="w-full max-w-sm space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">เชื่อม LINE กับบัญชีพนักงาน</h1>
                    <p className="text-sm text-gray-500">
                        ล็อกอินด้วยบัญชีที่ได้รับจาก admin<br />
                        เพื่อรับแจ้งเตือนเคสผ่าน LINE
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <p className="text-sm text-red-700">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="staff@nbu.ac.th"
                                autoComplete="email"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                                disabled={status === 'loading'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="รหัสผ่านที่ได้รับจาก admin"
                                autoComplete="current-password"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                                disabled={status === 'loading'}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {status === 'loading' ? 'กำลังเชื่อม LINE...' : 'เชื่อม LINE'}
                    </button>
                </form>

                <p className="text-xs text-center text-gray-400">
                    หน้านี้ใช้สำหรับพนักงานเท่านั้น<br />
                    ข้อมูลจะถูกส่งผ่าน HTTPS อย่างปลอดภัย
                </p>
            </div>
        </div>
    )
}
