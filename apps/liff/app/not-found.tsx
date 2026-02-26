export default function LiffNotFound() {
    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <div className="card text-center space-y-4 max-w-sm w-full">
                <div className="text-5xl">🔍</div>
                <h1 className="text-lg font-bold text-gray-900">ไม่พบหน้าที่ต้องการ</h1>
                <p className="text-sm text-gray-500">
                    URL ที่คุณเข้าถึงไม่มีในระบบ
                </p>
            </div>
        </main>
    )
}
