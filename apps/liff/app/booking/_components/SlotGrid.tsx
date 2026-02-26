'use client'

interface Slot {
    id: string
    date: string
    start_time: string
    end_time: string
    available: boolean
}

interface SlotGridProps {
    slots: Slot[]
    selectedId: string | null
    onSelect: (id: string) => void
}

function formatTime(t: string) {
    return t.slice(0, 5) // "HH:MM"
}

function groupByDate(slots: Slot[]): Map<string, Slot[]> {
    const map = new Map<string, Slot[]>()
    for (const s of slots) {
        const arr = map.get(s.date) ?? []
        arr.push(s)
        map.set(s.date, arr)
    }
    return map
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })
}

export default function SlotGrid({ slots, selectedId, onSelect }: SlotGridProps) {
    if (slots.length === 0) {
        return (
            <div className="card text-center py-8 text-gray-400 text-sm">
                ไม่มีช่วงเวลาว่างในขณะนี้
            </div>
        )
    }

    const grouped = groupByDate(slots)

    return (
        <div className="space-y-4">
            {Array.from(grouped.entries()).map(([date, daySlots]) => (
                <div key={date} className="card">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                        📅 {formatDate(date)}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {daySlots.map((slot) => {
                            const isSelected = slot.id === selectedId
                            const cls = [
                                'slot-chip',
                                slot.available ? 'available' : 'unavailable',
                                isSelected ? 'selected' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')

                            return (
                                <button
                                    key={slot.id}
                                    type="button"
                                    disabled={!slot.available}
                                    className={cls}
                                    onClick={() => slot.available && onSelect(slot.id)}
                                    aria-pressed={isSelected}
                                >
                                    {formatTime(slot.start_time)}
                                    <span className="block text-xs text-gray-400">
                                        –{formatTime(slot.end_time)}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
