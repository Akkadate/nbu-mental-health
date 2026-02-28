'use client'

import { useState, useTransition } from 'react'
import type { Appointment } from '../../../../../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

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

export default function AppointmentTable({ appointments: initial }: AppointmentTableProps) {
    const [appointments, setAppointments] = useState<Appointment[]>(initial)
    const [filter, setFilter] = useState<string>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [noteText, setNoteText] = useState<string>('')
    const [isPending, startTransition] = useTransition()
    const [updateError, setUpdateError] = useState<string | null>(null)
    const [noteSaving, setNoteSaving] = useState(false)
    const [noteSaved, setNoteSaved] = useState(false)

    const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter)
    const filters = ['all', 'scheduled', 'completed', 'cancelled', 'no_show']

    const handleStatusChange = (id: string, newStatus: string) => {
        const label = statusLabel[newStatus] ?? newStatus
        if (!window.confirm(`เปลี่ยนสถานะเป็น "${label}" ใช่หรือไม่?`)) return
        setUpdateError(null)
        startTransition(async () => {
            const res = await fetch(`${API_BASE}/appointments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                setAppointments((prev) =>
                    prev.map((a) =>
                        a.id === id ? { ...a, status: newStatus as Appointment['status'] } : a
                    )
                )
            } else {
                const body = await res.json().catch(() => ({}))
                setUpdateError(body?.error ?? `HTTP ${res.status}`)
            }
        })
    }

    const handleExpandNote = (appt: Appointment) => {
        if (expandedId === appt.id) {
            setExpandedId(null)
            return
        }
        setExpandedId(appt.id)
        setNoteText(appt.advisor_note ?? '')
        setNoteSaved(false)
    }

    const handleSaveNote = (id: string) => {
        setNoteSaving(true)
        setNoteSaved(false)
        startTransition(async () => {
            const res = await fetch(`${API_BASE}/advisory/appointments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ advisor_note: noteText }),
            })
            setNoteSaving(false)
            if (res.ok) {
                setAppointments((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, advisor_note: noteText } : a))
                )
                setNoteSaved(true)
                setTimeout(() => setNoteSaved(false), 2500)
            } else {
                setUpdateError('บันทึกโน้ตไม่สำเร็จ')
            }
        })
    }

    return (
        <div className="card p-0 overflow-hidden">
            {/* Filter bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[--color-border] bg-gray-50/50 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            filter === f
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                        }`}
                    >
                        {f === 'all' ? 'ทั้งหมด' : statusLabel[f]}
                    </button>
                ))}
                <span className="ml-auto text-xs text-gray-400">{filtered.length} รายการ</span>
            </div>

            {updateError && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
                    {updateError}
                </div>
            )}

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
                                <th className="text-left px-4 py-3 font-medium text-gray-600">โน้ต</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((appt) => (
                                <>
                                    <tr key={appt.id} className="border-t border-[--color-border] hover:bg-gray-50/50 transition-colors">
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
                                            {appt.status === 'scheduled' ? (
                                                <select
                                                    value={appt.status}
                                                    disabled={isPending}
                                                    onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:ring-1 focus:ring-brand-300 focus:border-brand-300 disabled:opacity-50"
                                                >
                                                    <option value="scheduled">นัดหมาย</option>
                                                    <option value="completed">เสร็จสิ้น</option>
                                                    <option value="cancelled">ยกเลิก</option>
                                                    <option value="no_show">ไม่มา</option>
                                                </select>
                                            ) : (
                                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[appt.status] ?? ''}`}>
                                                    {statusLabel[appt.status] ?? appt.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleExpandNote(appt)}
                                                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                                    expandedId === appt.id
                                                        ? 'bg-brand-50 text-brand-700 border-brand-200'
                                                        : appt.advisor_note
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                                                }`}
                                            >
                                                {appt.advisor_note ? '📝 ดู/แก้ไข' : '+ บันทึก'}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedId === appt.id && (
                                        <tr key={`${appt.id}-note`} className="border-t border-brand-100 bg-brand-50/30">
                                            <td colSpan={5} className="px-4 py-3">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium text-gray-600">
                                                        บันทึกการให้คำปรึกษา
                                                        <span className="ml-1 text-gray-400 font-normal">(มองเห็นเฉพาะอาจารย์ที่ปรึกษา ไม่เกี่ยวกับข้อมูลสุขภาพจิต)</span>
                                                    </p>
                                                    <textarea
                                                        value={noteText}
                                                        onChange={(e) => setNoteText(e.target.value)}
                                                        rows={4}
                                                        placeholder="พิมพ์บันทึกการให้คำปรึกษา เช่น ปัญหาที่พูดคุย แนวทางแก้ไข นัดติดตาม..."
                                                        className="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none bg-white"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleSaveNote(appt.id)}
                                                            disabled={noteSaving}
                                                            className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            {noteSaving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                                                        </button>
                                                        <button
                                                            onClick={() => setExpandedId(null)}
                                                            className="text-xs px-3 py-1.5 bg-white text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                        >
                                                            ปิด
                                                        </button>
                                                        {noteSaved && (
                                                            <span className="text-xs text-green-600">✅ บันทึกแล้ว</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
