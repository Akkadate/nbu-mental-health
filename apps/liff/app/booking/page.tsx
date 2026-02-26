import { Metadata } from 'next'
import { Suspense } from 'react'
import LiffProvider from '../_components/LiffProvider'
import BookingFlow from './_components/BookingFlow'

export const metadata: Metadata = { title: 'จองนัดหมาย | NBU Mental Health' }

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_BOOKING ?? ''

export default async function BookingPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: 'advisor' | 'counselor'; mode?: 'online' | 'onsite' }>
}) {
    const { type, mode } = await searchParams

    return (
        <LiffProvider liffId={LIFF_ID}>
            <main className="min-h-screen p-4">
                <div className="mb-6 text-center">
                    <div className="text-4xl mb-2">📅</div>
                    <h1 className="text-xl font-bold text-gray-900">จองนัดหมาย</h1>
                    <p className="text-sm text-gray-500 mt-1">เลือกช่วงเวลาที่สะดวก</p>
                </div>
                <Suspense fallback={<div className="card animate-pulse h-64" />}>
                    <BookingFlow initialType={type} initialMode={mode} />
                </Suspense>
            </main>
        </LiffProvider>
    )
}
