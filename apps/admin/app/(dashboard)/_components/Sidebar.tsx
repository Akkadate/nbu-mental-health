'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Role = 'advisor' | 'counselor' | 'admin'

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
    roles: Role[]
}

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
)

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

const FolderIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
)

const ChartIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
)

const BookOpenIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
)

const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
)

const AcademicCapIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
)

const ClipboardIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
)

const navItems: NavItem[] = [
    { href: '/advisor/appointments', label: 'นัดหมายของฉัน', icon: <CalendarIcon />, roles: ['advisor'] },
    { href: '/advisor/slots', label: 'จัดการตารางเวลา', icon: <ClockIcon />, roles: ['advisor'] },
    { href: '/counselor/cases', label: 'คิวเคส', icon: <FolderIcon />, roles: ['counselor'] },
    { href: '/counselor/screenings', label: 'ผลแบบประเมิน', icon: <ClipboardIcon />, roles: ['counselor'] },
    { href: '/counselor/appointments', label: 'นัดหมาย', icon: <CalendarIcon />, roles: ['counselor'] },
    { href: '/counselor/slots', label: 'ตารางเวลา', icon: <ClockIcon />, roles: ['counselor'] },
    { href: '/admin/analytics', label: 'วิเคราะห์ข้อมูล', icon: <ChartIcon />, roles: ['admin'] },
    { href: '/admin/resources', label: 'แหล่งช่วยเหลือ', icon: <BookOpenIcon />, roles: ['admin'] },
    { href: '/admin/users', label: 'จัดการบัญชีพนักงาน', icon: <UsersIcon />, roles: ['admin'] },
    { href: '/admin/students', label: 'รายชื่อนักศึกษา', icon: <AcademicCapIcon />, roles: ['admin'] },
]

interface SidebarProps {
    role: Role
}

export default function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname()

    const filtered = navItems.filter((item) => item.roles.includes(role))

    return (
        <aside className="hidden md:flex flex-col w-64 h-full bg-white border-r border-[--color-border] shrink-0">
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-[--color-border]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-bold text-brand-900 leading-tight">NBU Mental Health</p>
                    <p className="text-xs text-brand-500 capitalize">{role}</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {filtered.map((item) => {
                    const active = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <span className={active ? 'text-brand-600' : 'text-gray-400'}>{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[--color-border]">
                <p className="text-xs text-gray-400">© 2025 มหาวิทยาลัยนอร์ทกรุงเทพ</p>
            </div>
        </aside>
    )
}
