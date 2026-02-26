import { Metadata } from 'next'
import { Suspense } from 'react'
import { getAnalyticsOverviewApi, getFacultyHeatmapApi } from '../../../../lib/api'
import AnalyticsCards from './_components/AnalyticsCards'
import FacultyHeatmap from './_components/FacultyHeatmap'

export const metadata: Metadata = { title: 'วิเคราะห์ข้อมูล' }

export default async function AdminAnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string; date?: string }>
}) {
    const { from, to, date } = await searchParams

    const [overview, heatmap] = await Promise.all([
        getAnalyticsOverviewApi(from, to).catch(() => null),
        getFacultyHeatmapApi(date).catch(() => []),
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900">วิเคราะห์ข้อมูล</h1>
                <p className="text-sm text-gray-500 mt-0.5">ภาพรวมสุขภาพจิตนักศึกษา (ข้อมูลรวม ไม่ระบุตัวตน)</p>
            </div>

            <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <div key={i} className="card animate-pulse h-24" />)}</div>}>
                <AnalyticsCards overview={overview} />
            </Suspense>

            <Suspense fallback={<div className="card animate-pulse h-64" />}>
                <FacultyHeatmap rows={heatmap} />
            </Suspense>
        </div>
    )
}
