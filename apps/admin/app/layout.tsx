import type { Metadata } from 'next'
import { Inter, Noto_Sans_Thai } from 'next/font/google'
import './globals.css'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

const notoSansThai = Noto_Sans_Thai({
    subsets: ['thai'],
    variable: '--font-noto-thai',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
    title: {
        template: '%s | NBU Mental Health',
        default: 'NBU Mental Health — Staff Portal',
    },
    description: 'ระบบดูแลสุขภาพจิตนักศึกษา มหาวิทยาลัยนอร์ทกรุงเทพ — สำหรับเจ้าหน้าที่',
    robots: { index: false, follow: false },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="th" className={`${inter.variable} ${notoSansThai.variable}`}>
            <body className="min-h-screen bg-[--color-surface] font-sans antialiased">
                {children}
            </body>
        </html>
    )
}
