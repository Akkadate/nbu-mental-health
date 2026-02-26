'use client'

import type { AnalyticsOverview } from '../../../../../lib/api'

interface AnalyticsCardsProps {
    overview: AnalyticsOverview | null
}

interface StatCardProps {
    label: string
    value: number | string
    color?: string
    emoji?: string
}

function StatCard({ label, value, color = 'text-gray-900', emoji }: StatCardProps) {
    return (
        <div className="card flex flex-col gap-1">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <div className="flex items-end gap-1.5">
                {emoji && <span className="text-lg">{emoji}</span>}
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
        </div>
    )
}

export default function AnalyticsCards({ overview }: AnalyticsCardsProps) {
    if (!overview) {
        return (
            <div className="card text-center py-8 text-gray-400">
                <p className="text-sm">ไม่สามารถโหลดข้อมูลได้</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="แบบประเมินทั้งหมด" value={overview.totalScreenings} emoji="📋" />
            <StatCard label="ความเสี่ยงต่ำ" value={overview.riskLow} emoji="🌿" color="text-[--color-risk-low]" />
            <StatCard label="ความเสี่ยงปานกลาง" value={overview.riskModerate} emoji="💛" color="text-[--color-risk-moderate]" />
            <StatCard label="ความเสี่ยงสูง" value={overview.riskHigh} emoji="🧡" color="text-[--color-risk-high]" />
            <StatCard label="วิกฤต" value={overview.riskCrisis} emoji="🚨" color="text-[--color-risk-crisis]" />
            <StatCard label="นัดอาจารย์ที่ปรึกษา" value={overview.advisorAppointments} emoji="📅" />
            <StatCard label="นัดนักจิตวิทยา" value={overview.counselorAppointments} emoji="🩺" />
            <StatCard label="เคสที่เปิดอยู่" value={overview.openCases} emoji="📂" color="text-amber-600" />
        </div>
    )
}
