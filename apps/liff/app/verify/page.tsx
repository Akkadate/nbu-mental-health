import { Metadata } from 'next'
import LiffProvider from '../_components/LiffProvider'
import VerifyForm from './_components/VerifyForm'

export const metadata: Metadata = { title: 'ยืนยันตัวตน | NBU Mental Health' }

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_VERIFY ?? ''

export default function VerifyPage() {
    return (
        <LiffProvider liffId={LIFF_ID}>
            <main className="min-h-screen p-4">
                <div className="mb-6 text-center">
                    <div className="text-4xl mb-2">🔐</div>
                    <h1 className="text-xl font-bold text-gray-900">ยืนยันตัวตน</h1>
                    <p className="text-sm text-gray-500 mt-1">เชื่อมต่อบัญชี LINE กับรหัสนักศึกษา</p>
                </div>
                <VerifyForm />
            </main>
        </LiffProvider>
    )
}
