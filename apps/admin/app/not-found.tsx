import Link from 'next/link'

export default function NotFound() {
    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="text-center">
                <p className="text-6xl font-bold text-brand-200 mb-3">404</p>
                <h1 className="text-xl font-bold text-gray-900 mb-2">ไม่พบหน้านี้</h1>
                <p className="text-sm text-gray-500 mb-6">หน้าที่คุณต้องการไม่มีอยู่หรือถูกย้ายไปแล้ว</p>
                <Link
                    href="/"
                    className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                >
                    กลับหน้าแรก
                </Link>
            </div>
        </main>
    )
}
