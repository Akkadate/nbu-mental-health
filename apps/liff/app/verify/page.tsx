import { Metadata } from 'next'
import LiffProvider from '../_components/LiffProvider'
import VerifyForm from './_components/VerifyForm'

export const metadata: Metadata = { title: 'ยืนยันตัวตน | NBU Mental Health' }

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_VERIFY ?? ''

export default function VerifyPage() {
    return (
        <LiffProvider liffId={LIFF_ID}>
            <main className="min-h-screen">
                <VerifyForm />
            </main>
        </LiffProvider>
    )
}
