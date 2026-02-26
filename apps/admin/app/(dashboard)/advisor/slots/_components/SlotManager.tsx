'use client'

import { useState, useTransition } from 'react'
import type { Slot } from '../../../../../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

async function createSlot(data: { startAt: string; endAt: string }, path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            start_at: new Date(data.startAt).toISOString(),
            end_at: new Date(data.endAt).toISOString(),
        }),
        credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to create slot')
    return res.json()
}

async function deleteSlot(id: string, path: string) {
    const res = await fetch(`${API_BASE}${path}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to delete slot')
}

interface SlotManagerProps {
    initialSlots: Slot[]
    apiPath?: string
}

export default function SlotManager({ initialSlots, apiPath = '/advisory/slots' }: SlotManagerProps) {
    const [slots, setSlots] = useState<Slot[]>(initialSlots)
    const [startAt, setStartAt] = useState('')
    const [endAt, setEndAt] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleAdd = () => {
        if (!startAt || !endAt) {
            setError('กรุณาเลือกวันเวลาเริ่มต้นและสิ้นสุด')
            return
        }
        if (new Date(endAt) <= new Date(startAt)) {
            setError('เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น')
            return
        }
        setError(null)
        startTransition(async () => {
            try {
                const newSlot = await createSlot({ startAt, endAt }, apiPath)
                setSlots((prev) => [...prev, newSlot])
                setStartAt('')
                setEndAt('')
            } catch {
                setError('ไม่สามารถเพิ่มช่วงเวลาได้ กรุณาลองใหม่')
            }
        })
    }

    const handleDelete = (id: string) => {
        startTransition(async () => {
            try {
                await deleteSlot(id, apiPath)
                setSlots((prev) => prev.filter((s) => s.id !== id))
            } catch {
                setError('ไม่สามารถลบช่วงเวลาได้')
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* Add slot form */}
            <div className="card">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">เพิ่มช่วงเวลาใหม่</h2>
                {error && (
                    <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">เวลาเริ่มต้น</label>
                        <input
                            type="datetime-local"
                            value={startAt}
                            onChange={(e) => setStartAt(e.target.value)}
                            className="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">เวลาสิ้นสุด</label>
                        <input
                            type="datetime-local"
                            value={endAt}
                            onChange={(e) => setEndAt(e.target.value)}
                            className="w-full border border-[--color-border] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        />
                    </div>
                </div>
                <button
                    onClick={handleAdd}
                    disabled={isPending}
                    className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                    {isPending ? 'กำลังบันทึก...' : '+ เพิ่มช่วงเวลา'}
                </button>
            </div>

            {/* Slot list */}
            <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-[--color-border] bg-gray-50/50">
                    <p className="text-sm font-medium text-gray-700">ช่วงเวลาทั้งหมด ({slots.length})</p>
                </div>
                {slots.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-400">ยังไม่มีช่วงเวลา — เพิ่มด้านบน</p>
                ) : (
                    <ul className="divide-y divide-[--color-border]">
                        {slots.map((slot) => (
                            <li key={slot.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">
                                        {new Date(slot.start_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                        {' → '}
                                        {new Date(slot.end_at).toLocaleString('th-TH', { timeStyle: 'short' })}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {slot.is_available ? '✅ ว่าง' : '❌ จองแล้ว'}
                                    </p>
                                </div>
                                {slot.is_available && (
                                    <button
                                        onClick={() => handleDelete(slot.id)}
                                        disabled={isPending}
                                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                                    >
                                        ลบ
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
