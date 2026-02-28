'use client'

import { useTransition } from 'react'
import { logoutAction } from '../../_actions/auth'

interface TopbarProps {
    name: string
    role: string
    onMenuClick: () => void
}

const roleLabel: Record<string, string> = {
    advisor: 'อาจารย์ที่ปรึกษา',
    counselor: 'นักจิตวิทยา',
    admin: 'ผู้ดูแลระบบ',
}

export default function Topbar({ name, role, onMenuClick }: TopbarProps) {
    const [isPending, startTransition] = useTransition()

    const handleLogout = () => {
        startTransition(async () => {
            await logoutAction()
        })
    }

    return (
        <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white border-b border-[--color-border] shrink-0">
            <div className="flex items-center gap-3">
                {/* Hamburger — mobile only */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    aria-label="เปิดเมนู"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Logo — mobile only */}
                <div className="md:hidden flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <span className="text-sm font-bold text-brand-900">NBU Mental Health</span>
                </div>

                {/* Desktop: show name + role */}
                <div className="hidden md:block">
                    <p className="text-sm font-semibold text-gray-800">{name}</p>
                    <p className="text-xs text-gray-500">{roleLabel[role] ?? role}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Mobile: name + role */}
                <div className="md:hidden text-right">
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{name}</p>
                    <p className="text-xs text-gray-400">{roleLabel[role] ?? role}</p>
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold select-none shrink-0">
                    {(name ?? '?').charAt(0).toUpperCase()}
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="ออกจากระบบ"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </header>
    )
}
