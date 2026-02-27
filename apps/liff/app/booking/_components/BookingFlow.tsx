'use client'

import { useState, useEffect, useTransition } from 'react'
import { useLiff } from '../../_components/LiffProvider'
import SlotGrid from './SlotGrid'
import {
    GraduationCap,
    HeartPulse,
    Building2,
    Video,
    CheckCircle2,
    CalendarDays,
    ChevronLeft,
    CheckCheck,
} from 'lucide-react'

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

const TYPE_OPTIONS = [
    {
        value: 'advisor' as StaffType,
        label: 'อาจารย์ที่ปรึกษา',
        desc: 'ด้านการเรียนและชีวิตมหาวิทยาลัย',
        Icon: GraduationCap,
        color: 'text-blue-500',
        bg: 'bg-blue-50',
    },
    {
        value: 'counselor' as StaffType,
        label: 'นักจิตวิทยา',
        desc: 'ด้านสุขภาพจิตและอารมณ์',
        Icon: HeartPulse,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50',
    },
]

const MODE_OPTIONS = [
    {
        value: 'onsite' as MeetingMode,
        label: 'พบที่มหาวิทยาลัย',
        desc: 'ห้องให้คำปรึกษา',
        Icon: Building2,
        color: 'text-orange-500',
        bg: 'bg-orange-50',
    },
    {
        value: 'online' as MeetingMode,
        label: 'ออนไลน์',
        desc: 'Video Call ผ่านลิงก์ที่จะส่งให้',
        Icon: Video,
        color: 'text-violet-500',
        bg: 'bg-violet-50',
    },
]

type AnyOption = (typeof TYPE_OPTIONS)[number] | (typeof MODE_OPTIONS)[number]

function OptionCard({
    option,
    selected,
    onSelect,
}: {
    option: AnyOption
    selected: boolean
    onSelect: () => void
}) {
    const { label, desc, Icon, color, bg } = option
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`relative w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
                selected
                    ? 'border-[--color-line-green] bg-[--color-line-green]/5 shadow-sm'
                    : 'border-[--color-border] bg-white'
            }`}
        >
            <div className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-xl ${selected ? 'bg-[--color-line-green]/10' : bg}`}>
                <Icon size={22} className={selected ? 'text-[--color-line-green]' : color} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${selected ? 'text-[--color-line-green]' : 'text-gray-800'}`}>
                    {label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
            {selected && <CheckCircle2 size={20} className="shrink-0 text-[--color-line-green]" />}
        </button>
    )
}

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

    useEffect(() => {
        if (step !== 'pick') return
        setSlotsLoading(true)
        setSlotsError('')
        setSelectedSlotId(null)
        setSlots([])

        fetch(`${API_BASE}/appointments/slots?type=${staffType}&limit=30`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<{ data: Slot[] }>
            })
            .then(({ data }) => setSlots(data ?? []))
            .catch(() => setSlotsError('โหลดช่วงเวลาไม่สำเร็จ กรุณาลองใหม่'))
            .finally(() => setSlotsLoading(false))
    }, [step, staffType, accessToken])

    // ─── Config ───────────────────────────────────────────────────────────────
    if (step === 'config') {
        return (
            <div className="space-y-5">
                <div className="card space-y-3">
                    <p className="text-sm font-semibold text-gray-700">ต้องการพบใคร?</p>
                    <div className="space-y-2">
                        {TYPE_OPTIONS.map((opt) => (
                            <OptionCard
                                key={opt.value}
                                option={opt}
                                selected={staffType === opt.value}
                                onSelect={() => setStaffType(opt.value)}
                            />
                        ))}
                    </div>
                </div>

                <div className="card space-y-3">
                    <p className="text-sm font-semibold text-gray-700">รูปแบบการพบ</p>
                    <div className="space-y-2">
                        {MODE_OPTIONS.map((opt) => (
                            <OptionCard
                                key={opt.value}
                                option={opt}
                                selected={meetingMode === opt.value}
                                onSelect={() => setMeetingMode(opt.value)}
                            />
                        ))}
                    </div>
                </div>

                <button type="button" className="btn-line" onClick={() => setStep('pick')}>
                    <CalendarDays size={16} className="inline mr-2" />
                    ดูช่วงเวลาว่าง
                </button>
            </div>
        )
    }

    // ─── Pick slot ────────────────────────────────────────────────────────────
    if (step === 'pick') {
        const typeOpt = TYPE_OPTIONS.find((t) => t.value === staffType)!
        const modeOpt = MODE_OPTIONS.find((m) => m.value === meetingMode)!

        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setStep('config')}
                        className="flex items-center gap-1 py-1.5 px-3 rounded-lg border border-[--color-border] text-sm text-gray-600 bg-white"
                    >
                        <ChevronLeft size={14} /> เปลี่ยน
                    </button>
                    <span className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 border border-[--color-border]">
                        <typeOpt.Icon size={14} className={typeOpt.color} />
                        {typeOpt.label}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 border border-[--color-border]">
                        <modeOpt.Icon size={14} className={modeOpt.color} />
                        {modeOpt.label}
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
                    <SlotGrid slots={slots} selectedId={selectedSlotId} onSelect={setSelectedSlotId} />
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

    // ─── Confirm ──────────────────────────────────────────────────────────────
    if (step === 'confirm') {
        const chosen = slots.find((s) => s.id === selectedSlotId)
        const typeOpt = TYPE_OPTIONS.find((t) => t.value === staffType)!
        const modeOpt = MODE_OPTIONS.find((m) => m.value === meetingMode)!

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
                            type: staffType,
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
                <div className="card space-y-4">
                    <h2 className="font-semibold text-gray-900">ยืนยันการจอง</h2>
                    <div className="divide-y divide-[--color-border]">
                        <div className="flex items-center justify-between py-2.5">
                            <span className="flex items-center gap-2 text-sm text-gray-400">
                                <typeOpt.Icon size={14} /> ประเภท
                            </span>
                            <span className="text-sm font-medium text-gray-700">{typeOpt.label}</span>
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                            <span className="flex items-center gap-2 text-sm text-gray-400">
                                <modeOpt.Icon size={14} /> รูปแบบ
                            </span>
                            <span className="text-sm font-medium text-gray-700">{modeOpt.label}</span>
                        </div>
                        {chosen && (
                            <>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="flex items-center gap-2 text-sm text-gray-400">
                                        <CalendarDays size={14} /> วันที่
                                    </span>
                                    <span className="text-sm font-medium text-gray-700">
                                        {new Date(chosen.date).toLocaleDateString('th-TH', {
                                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="text-sm text-gray-400">เวลา</span>
                                    <span className="text-sm font-semibold text-gray-800">
                                        {chosen.start_time.slice(0, 5)} – {chosen.end_time.slice(0, 5)} น.
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            หมายเหตุ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
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
                        className="flex items-center justify-center gap-1 flex-1 py-3 rounded-xl border border-[--color-border] text-sm font-medium text-gray-600 bg-white"
                    >
                        <ChevronLeft size={14} /> เปลี่ยนเวลา
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={handleBook}
                        className="flex-[2] btn-line"
                    >
                        {isPending ? 'กำลังจอง...' : (
                            <><CheckCheck size={16} className="inline mr-1.5" />ยืนยันการจอง</>
                        )}
                    </button>
                </div>
            </div>
        )
    }

    // ─── Done ─────────────────────────────────────────────────────────────────
    if (step === 'done') {
        return (
            <div className="card text-center space-y-4 py-8">
                <div className="flex justify-center">
                    <CheckCircle2 size={56} className="text-[--color-line-green]" />
                </div>
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
