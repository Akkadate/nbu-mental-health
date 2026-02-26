'use client'

import { useEffect } from 'react'

export default function LiffError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[LIFF Error]', error)
    }, [error])

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <div className="card text-center space-y-4 max-w-sm w-full">
                <div className="text-5xl">⚠️</div>
                <h1 className="text-lg font-bold text-gray-900">เกิดข้อผิดพลาด</h1>
                <p className="text-sm text-gray-500">
                    {error.message ?? 'ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด'}
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="btn-line"
                >
                    🔄 ลองใหม่
                </button>
            </div>
        </main>
    )
}
