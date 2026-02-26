'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <html lang="th">
            <body className="min-h-screen flex items-center justify-center bg-red-50 p-8">
                <div className="text-center">
                    <p className="text-4xl mb-4">⚠️</p>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาดร้ายแรง</h1>
                    <p className="text-sm text-gray-600 mb-4">{error.message}</p>
                    <button onClick={reset} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                        รีโหลด
                    </button>
                </div>
            </body>
        </html>
    )
}
