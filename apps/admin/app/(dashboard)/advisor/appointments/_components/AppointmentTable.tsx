'use client'

import { useState, useTransition } from 'react'
import type { Appointment } from '../../../../../lib/api'

const statusLabel: Record<string, string> = {
    scheduled: 'นัดหมาย',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
    no_show: 'ไม่มา',
}

const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
    no_show: 'bg-red-50 text-red-700 border-red-200',
}

interface AppointmentTableProps {
    appointments: Appointment[]
}

export default function AppointmentTable({ appointments }: AppointmentTableProps) {
    const [filter, setFilter] = useState<string>('all')
    const [_isPending, startTransition] = useTransition()

    const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter)

    const filters = ['all', 'scheduled', 'completed', 'cancelled', 'no_show']

    return (
        <div className="card p-0 overflow-hidden">
            {/* Filter bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[--color-border] bg-gray-50/50 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => startTransition(() => setFilter(f))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === f
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                            }`}
                    >
                        {f === 'all' ? 'ทั้งหมด' : statusLabel[f]}
                    </button>
                ))}
                <span className="ml-auto text-xs text-gray-400">{filtered.length} รายการ</span>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">ไม่มีรายการนัดหมาย</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[--color-border] bg-gray-50/50">
                                <th className="text-left px-4 py-3 font-medium text-gray-600">นักศึกษา</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">วันเวลา</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">รูปแบบ</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[--color-border]">
                            {filtered.map((appt) => (
                                <tr key={appt.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900">{appt.student_code}</p>
                                        <p className="text-xs text-gray-400">{appt.faculty ?? '—'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {new Date(appt.scheduled_at).toLocaleString('th-TH', {
                                            dateStyle: 'short',
                                            timeStyle: 'short',
                                        })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                                            {appt.mode === 'online' ? 'ออนไลน์' : 'ออนไซต์'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[appt.status] ?? ''}`}>
                                            {statusLabel[appt.status] ?? appt.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
