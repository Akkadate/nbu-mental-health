'use client'

import { useState, useEffect, useTransition } from 'react'
import { useLiff } from '../../_components/LiffProvider'
import SlotGrid from './SlotGrid'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type StaffType = 'advisor' | 'counselor'
type MeetingMode = 'online' | 'onsite'

interface Slot {
    id: string
    date: string
    start_time: string
    end_time: string
    available: boolean
}

interface BookingFlowProps {
    initialType?: StaffType
    initialMode?: MeetingMode
}

const TYPE_OPTIONS: { value: StaffType; label: string; emoji: string }[] = [
    { value: 'advisor', label: 'อาจารย์ที่ปรึกษา', emoji: '👨‍🏫' },
    { value: 'counselor', label: 'นักจิตวิทยา', emoji: '🧑‍⚕️' },
]

const MODE_OPTIONS: { value: MeetingMode; label: string; emoji: string }[] = [
    { value: 'onsite', label: 'ที่มหาวิทยาลัย', emoji: '🏫' },
    { value: 'online', label: 'ออนไลน์ (Video Call)', emoji: '💻' },
]

export default function BookingFlow({ initialType, initialMode }: BookingFlowProps) {
    const { profile, accessToken } = useLiff()

    const [staffType, setStaffType] = useState<StaffType>(initialType ?? 'advisor')
    const [meetingMode, setMeetingMode] = useState<MeetingMode>(initialMode ?? 'onsite')
    const [slots, setSlots] = useState<Slot[]>([])
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [slotsError, setSlotsError] = useState('')

    const [step, setStep] = useState<'config' | 'pick' | 'confirm' | 'done'>('config')
    const [note, setNote] = useState('')
    const [isPending, startTransition] = useTransition()
    const [submitError, setSubmitError] = useState('')

    // Load slots whenever type/mode changes (and we are on pick step)
    useEffect(() => {
        if (step !== 'pick') return
        setSlotsLoading(true)
        setSlotsError('')
        setSelectedSlotId(null)
        setSlots([])

        fetch(`${API_BASE}/slots?type=${staffType}&mode=${meetingMode}&limit=30`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<{ data: Slot[] }>
            })
            .then(({ data }) => setSlots(data ?? []))
            .catch(() => setSlotsError('โหลดช่วงเวลาไม่สำเร็จ กรุณาลองใหม่'))
            .finally(() => setSlotsLoading(false))
    }, [step, staffType, meetingMode, accessToken])

    // ─── Step: Config ─────────────────────────────────────────────────────────
    if (step === 'config') {
        return (
            <div className="space-y-5">
                <div className="card space-y-4">
                    <p className="text-sm font-semibold text-gray-700">ต้องการพบใคร?</p>
                    <div className="grid grid-cols-2 gap-2">
                        {TYPE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setStaffType(opt.value)}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors ${staffType === opt.value
                                        ? 'bg-[--color-line-green] text-white border-[--color-line-green]'
                                        : 'bg-white text-gray-600 border-[--color-border]'
                                    }`}
                            >
                                {opt.emoji} <span className="block text-xs mt-0.5">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card space-y-4">
                    <p className="text-sm font-semibold text-gray-700">รูปแบบการพบ</p>
                    <div className="grid grid-cols-2 gap-2">
                        {MODE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setMeetingMode(opt.value)}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-colors ${meetingMode === opt.value
                                        ? 'bg-[--color-line-green] text-white border-[--color-line-green]'
                                        : 'bg-white text-gray-600 border-[--color-border]'
                                    }`}
                            >
                                {opt.emoji} <span className="block text-xs mt-0.5">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    className="btn-line"
                    onClick={() => setStep('pick')}
                >
                    ดูช่วงเวลาว่าง →
                </button>
            </div>
        )
    }

    // ─── Step: Pick slot ──────────────────────────────────────────────────────
    if (step === 'pick') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setStep('config')}
                        className="py-1.5 px-3 rounded-lg border border-[--color-border] text-sm text-gray-600 bg-white"
                    >
                        ← เปลี่ยน
                    </button>
                    <span className="text-sm text-gray-500">
                        {TYPE_OPTIONS.find((t) => t.value === staffType)?.emoji}{' '}
                        {TYPE_OPTIONS.find((t) => t.value === staffType)?.label} •{' '}
                        {MODE_OPTIONS.find((m) => m.value === meetingMode)?.label}
                    </span>
                </div>

                {slotsLoading && (
                    <div className="card animate-pulse h-40 flex items-center justify-center text-sm text-gray-400">
                        กำลังโหลดช่วงเวลา...
                    </div>
                )}

                {slotsError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {slotsError}
                    </div>
                )}

                {!slotsLoading && !slotsError && (
                    <SlotGrid
                        slots={slots}
                        selectedId={selectedSlotId}
                        onSelect={setSelectedSlotId}
                    />
                )}

                <button
                    type="button"
                    disabled={!selectedSlotId}
                    className="btn-line"
                    onClick={() => setStep('confirm')}
                >
                    ยืนยันช่วงเวลา →
                </button>
            </div>
        )
    }

    // ─── Step: Confirm ────────────────────────────────────────────────────────
    if (step === 'confirm') {
        const chosen = slots.find((s) => s.id === selectedSlotId)

        const handleBook = () => {
            setSubmitError('')
            startTransition(async () => {
                try {
                    const res = await fetch(`${API_BASE}/appointments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                        },
                        body: JSON.stringify({
                            slot_id: selectedSlotId,
                            line_user_id: profile?.userId,
                            mode: meetingMode,
                            note: note.trim() || undefined,
                        }),
                    })
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}))
                        throw new Error(body?.message ?? `HTTP ${res.status}`)
                    }
                    setStep('done')
                } catch (err) {
                    setSubmitError(
                        err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
                    )
                }
            })
        }

        return (
            <div className="space-y-4">
                {submitError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {submitError}
                    </div>
                )}
                <div className="card space-y-3">
                    <h2 className="font-semibold text-gray-900">ยืนยันการจอง</h2>
                    <div className="text-sm space-y-2 text-gray-600">
                        <div className="flex justify-between">
                            <span className="text-gray-400">ประเภท</span>
                            <span>{TYPE_OPTIONS.find((t) => t.value === staffType)?.label}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">รูปแบบ</span>
                            <span>{MODE_OPTIONS.find((m) => m.value === meetingMode)?.label}</span>
                        </div>
                        {chosen && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">วันที่</span>
                                    <span>
                                        {new Date(chosen.date).toLocaleDateString('th-TH', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">เวลา</span>
                                    <span>
                                        {chosen.start_time.slice(0, 5)} – {chosen.end_time.slice(0, 5)} น.
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            หมายเหตุ (ไม่บังคับ)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder="เรื่องที่ต้องการปรึกษา..."
                            className="w-full border border-[--color-border] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[--color-line-green] focus:border-[--color-line-green] resize-none"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setStep('pick')}
                        className="flex-1 py-3 rounded-xl border border-[--color-border] text-sm font-medium text-gray-600 bg-white"
                    >
                        ← เปลี่ยนเวลา
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={handleBook}
                        className="flex-[2] btn-line"
                    >
                        {isPending ? 'กำลังจอง...' : '✅ ยืนยันการจอง'}
                    </button>
                </div>
            </div>
        )
    }

    // ─── Step: Done ───────────────────────────────────────────────────────────
    if (step === 'done') {
        return (
            <div className="card text-center space-y-4 py-8">
                <div className="text-5xl">🎉</div>
                <h2 className="text-lg font-bold text-gray-900">จองนัดหมายสำเร็จ</h2>
                <p className="text-sm text-gray-500">
                    คุณจะได้รับการแจ้งเตือนผ่าน LINE เมื่อถึงวันนัดหมาย
                </p>
                <p className="text-sm text-gray-400">ปิดหน้าต่างนี้เพื่อกลับไปยัง LINE</p>
            </div>
        )
    }

    return null
}
