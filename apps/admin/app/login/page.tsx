import { Metadata } from 'next'
import LoginForm from './_components/LoginForm'

export const metadata: Metadata = {
    title: 'เข้าสู่ระบบ',
}

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-[--color-surface] to-brand-100 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-brand-900 leading-tight">
                        NBU Mental Health
                    </h1>
                    <p className="text-sm text-brand-600 mt-1">ระบบดูแลสุขภาพจิตนักศึกษา — เจ้าหน้าที่</p>
                </div>

                {/* Login Card */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">เข้าสู่ระบบ</h2>
                    <LoginForm />
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    มหาวิทยาลัยนอร์ทกรุงเทพ — ข้อมูลนี้ถูกรักษาไว้อย่างเป็นความลับ
                </p>
            </div>
        </main>
    )
}
