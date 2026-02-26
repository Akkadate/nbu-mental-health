'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { Case } from '../../../../../lib/api'

const priorityColor: Record<string, string> = {
    crisis: 'badge-crisis',
    high: 'badge-high',
}

const statusLabel: Record<string, string> = {
    open: 'เปิด',
    acked: 'รับทราบ',
    contacted: 'ติดต่อแล้ว',
    follow_up: 'ติดตาม',
    closed: 'ปิด',
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface CaseQueueProps {
    cases: Case[]
}

export default function CaseQueue({ cases: initialCases }: CaseQueueProps) {
    const [cases, setCases] = useState<Case[]>(initialCases)
    const [filter, setFilter] = useState<string>('all')
    const [isPending, startTransition] = useTransition()

    const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter)

    const handleAck = (id: string) => {
        startTransition(async () => {
            const res = await fetch(`${API_BASE}/clinical/cases/${id}/ack`, {
                method: 'POST',
                credentials: 'include',
            })
            if (res.ok) {
                setCases((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, status: 'acked' as const, ackedAt: new Date().toISOString() } : c)),
                )
            }
        })
    }

    return (
        <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {['all', 'open', 'acked', 'contacted', 'follow_up'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === f
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                            }`}
                    >
                        {f === 'all' ? 'ทั้งหมด' : statusLabel[f] ?? f}
                    </button>
                ))}
                <span className="ml-auto text-xs text-gray-400">{filtered.length} เคส</span>
            </div>

            {/* Cases list */}
            {filtered.length === 0 ? (
                <div className="card py-16 text-center text-gray-400">
                    <p className="text-sm">ไม่มีเคสในสถานะนี้ 🎉</p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden divide-y divide-[--color-border]">
                    {filtered.map((c) => (
                        <div key={c.id} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50/50">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${priorityColor[c.priority] ?? ''}`}>
                                        {c.priority === 'crisis' ? '🚨 วิกฤต' : '🧡 สูง'}
                                    </span>
                                    <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">
                                        {statusLabel[c.status] ?? c.status}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900">รหัส: {c.studentCode}</p>
                                <p className="text-xs text-gray-400">
                                    {new Date(c.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                                {c.status === 'open' && (
                                    <button
                                        onClick={() => handleAck(c.id)}
                                        disabled={isPending}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                    >
                                        รับทราบ
                                    </button>
                                )}
                                <Link
                                    href={`/counselor/cases/${c.id}`}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
                                >
                                    ดูรายละเอียด
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
