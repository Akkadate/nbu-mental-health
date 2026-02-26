'use client'

import { useTransition } from 'react'
import { logoutAction } from '../../_actions/auth'

interface TopbarProps {
    name: string
    role: string
}

const roleLabel: Record<string, string> = {
    advisor: 'อาจารย์ที่ปรึกษา',
    counselor: 'นักจิตวิทยา',
    admin: 'ผู้ดูแลระบบ',
}

export default function Topbar({ name, role }: TopbarProps) {
    const [isPending, startTransition] = useTransition()

    const handleLogout = () => {
        startTransition(async () => {
            await logoutAction()
        })
    }

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[--color-border] shrink-0">
            <div>
                <p className="text-sm font-semibold text-gray-800">{name}</p>
                <p className="text-xs text-gray-500">{roleLabel[role] ?? role}</p>
            </div>

            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold select-none">
                    {name.charAt(0).toUpperCase()}
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
