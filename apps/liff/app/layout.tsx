import type { Metadata } from 'next'
import { Noto_Sans_Thai, Inter } from 'next/font/google'
import './globals.css'

const notoSansThai = Noto_Sans_Thai({
    subsets: ['thai'],
    variable: '--font-noto-thai',
    display: 'swap',
    weight: ['400', '500', '600', '700'],
})

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'NBU Mental Health',
    description: 'แบบประเมินความเครียดและระบบดูแลสุขภาพจิต — มหาวิทยาลัยนอร์ทกรุงเทพ',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    themeColor: '#06C755',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="th" className={`${notoSansThai.variable} ${inter.variable}`}>
            <body className="min-h-screen bg-[--color-bg] font-sans antialiased">
                {children}
            </body>
        </html>
    )
}
