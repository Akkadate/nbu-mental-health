import { Metadata } from 'next'
import LiffProvider from '../_components/LiffProvider'
import ScreeningWizard from './_components/ScreeningWizard'

export const metadata: Metadata = { title: 'แบบประเมิน | NBU Mental Health' }

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_SCREENING ?? ''

export default function ScreeningPage() {
    return (
        <LiffProvider liffId={LIFF_ID}>
            <main className="min-h-screen p-4">
                <div className="mb-6 text-center">
                    <div className="text-4xl mb-2">🧠</div>
                    <h1 className="text-xl font-bold text-gray-900">แบบประเมินสุขภาพจิต</h1>
                    <p className="text-sm text-gray-500 mt-1">คำตอบของคุณจะถูกเก็บเป็นความลับ</p>
                </div>
                <ScreeningWizard />
            </main>
        </LiffProvider>
    )
}
