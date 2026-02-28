'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

type Role = 'advisor' | 'counselor' | 'admin'

interface Props {
    role: Role
    name: string
    children: React.ReactNode
}

export default function DashboardShell({ role, name, children }: Props) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-[--color-surface]">
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                <Topbar name={name} role={role} onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[--color-surface]">
                    {children}
                </main>
            </div>
        </div>
    )
}
