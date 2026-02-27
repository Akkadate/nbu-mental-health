import { Metadata } from 'next'
import Link from 'next/link'
import { getScreeningsApi, type Screening } from '../../../../lib/api'

export const metadata: Metadata = { title: 'ผลแบบประเมิน' }

const RISK_LEVELS = ['low', 'moderate', 'high', 'crisis'] as const

const riskLabel: Record<string, string> = {
    low: '🌿 ต่ำ',
    moderate: '💛 ปานกลาง',
    high: '🧡 สูง',
    crisis: '❤️ วิกฤต',
}

const riskBadge: Record<string, string> = {
    low: 'bg-green-50 text-green-700 border-green-200',
    moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    crisis: 'bg-red-50 text-red-700 border-red-200',
}

const typeLabel: Record<string, string> = {
    stress_mini: 'Stress Mini',
    phq9_gad7: 'PHQ-9/GAD-7',
}

type SearchParams = Promise<{ risk_level?: string; page?: string }>

export default async function ScreeningsPage({ searchParams }: { searchParams: SearchParams }) {
    const { risk_level, page } = await searchParams
    const currentPage = Math.max(1, Number(page) || 1)

    const result = await getScreeningsApi({
        risk_level: RISK_LEVELS.includes(risk_level as any) ? risk_level : undefined,
        page: currentPage,
        limit: 30,
    }).catch(() => ({ data: [] as Screening[], total: 0, page: 1, limit: 30 }))

    const totalPages = Math.ceil(result.total / result.limit)

    const filterHref = (rl: string | null) => {
        const p = new URLSearchParams()
        if (rl) p.set('risk_level', rl)
        return `/counselor/screenings?${p.toString()}`
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-gray-900">ผลแบบประเมิน</h1>
                <p className="text-sm text-gray-500 mt-0.5">ประวัติการประเมินสุขภาพจิตของนักศึกษาทั้งหมด</p>
            </div>

            {/* Risk level filter */}
            <div className="flex items-center gap-2 flex-wrap">
                <Link
                    href={filterHref(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        !risk_level
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                    }`}
                >
                    ทั้งหมด
                </Link>
                {RISK_LEVELS.map((rl) => (
                    <Link
                        key={rl}
                        href={filterHref(rl)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            risk_level === rl
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                        }`}
                    >
                        {riskLabel[rl]}
                    </Link>
                ))}
                <span className="ml-auto text-xs text-gray-400">{result.total} รายการ</span>
            </div>

            {/* Table */}
            {result.data.length === 0 ? (
                <div className="card py-16 text-center text-gray-400 text-sm">
                    ไม่มีข้อมูลการประเมิน
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[--color-border] bg-gray-50/50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">รหัสนักศึกษา</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">คณะ</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ประเภท</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">PHQ-9</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">GAD-7</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">ความเครียด</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ระดับ</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[--color-border]">
                                {result.data.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{s.student_code}</td>
                                        <td className="px-4 py-3 text-gray-500">{s.faculty ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{typeLabel[s.type] ?? s.type}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                                            {s.phq9_score !== null ? s.phq9_score : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                                            {s.gad7_score !== null ? s.gad7_score : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                                            {s.stress_score !== null ? s.stress_score : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${riskBadge[s.risk_level] ?? ''}`}>
                                                {riskLabel[s.risk_level] ?? s.risk_level}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                            {new Date(s.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {currentPage > 1 && (
                        <Link
                            href={`/counselor/screenings?${new URLSearchParams({ ...(risk_level ? { risk_level } : {}), page: String(currentPage - 1) }).toString()}`}
                            className="px-3 py-1.5 text-xs rounded-lg border border-[--color-border] bg-white text-gray-600 hover:border-brand-300"
                        >
                            ← ก่อนหน้า
                        </Link>
                    )}
                    <span className="text-xs text-gray-500">หน้า {currentPage} / {totalPages}</span>
                    {currentPage < totalPages && (
                        <Link
                            href={`/counselor/screenings?${new URLSearchParams({ ...(risk_level ? { risk_level } : {}), page: String(currentPage + 1) }).toString()}`}
                            className="px-3 py-1.5 text-xs rounded-lg border border-[--color-border] bg-white text-gray-600 hover:border-brand-300"
                        >
                            ถัดไป →
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
