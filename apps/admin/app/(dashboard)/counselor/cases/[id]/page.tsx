import { notFound } from 'next/navigation'
import { getCaseByIdApi } from '../../../../../lib/api'
import CaseNoteForm from '../_components/CaseNoteForm'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    return { title: `เคส ${id.slice(0, 8)}` }
}

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
    phq9_gad7: 'PHQ-9 / GAD-7',
}

export default async function CaseDetailPage({ params }: Props) {
    const { id } = await params
    const c = await getCaseByIdApi(id).catch(() => null)
    if (!c) notFound()

    const priorityColor = c.priority === 'crisis' ? 'badge-crisis' : 'badge-high'
    const s = c.screening

    return (
        <div className="max-w-2xl space-y-4">
            {/* Case header */}
            <div className="card">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">เคส #{c.id.slice(0, 8)}</p>
                        <h1 className="text-lg font-bold text-gray-900">
                            รหัสนักศึกษา: {(c as any).student_code ?? c.studentCode}
                        </h1>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${priorityColor}`}>
                        {c.priority === 'crisis' ? '🚨 วิกฤต' : '🧡 สูง'}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-xs text-gray-400">สถานะ</p>
                        <p className="font-medium text-gray-800 capitalize">{c.status}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">สร้างเมื่อ</p>
                        <p className="font-medium text-gray-800">
                            {new Date((c as any).created_at ?? c.createdAt).toLocaleDateString('th-TH', { dateStyle: 'short' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Screening result */}
            {s && (
                <div className="card space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 text-sm">ผลการประเมิน</h2>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${riskBadge[s.risk_level] ?? ''}`}>
                            {riskLabel[s.risk_level] ?? s.risk_level}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                            <p className="text-xs text-gray-400">ประเภทแบบประเมิน</p>
                            <p className="font-medium text-gray-800">{typeLabel[s.type] ?? s.type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">วันที่ประเมิน</p>
                            <p className="font-medium text-gray-800">
                                {new Date(s.created_at).toLocaleDateString('th-TH', { dateStyle: 'short' })}
                            </p>
                        </div>
                        {s.phq9_score !== null && (
                            <div>
                                <p className="text-xs text-gray-400">PHQ-9</p>
                                <p className="font-semibold text-gray-900">{s.phq9_score} <span className="text-gray-400 font-normal">/ 27</span></p>
                            </div>
                        )}
                        {s.gad7_score !== null && (
                            <div>
                                <p className="text-xs text-gray-400">GAD-7</p>
                                <p className="font-semibold text-gray-900">{s.gad7_score} <span className="text-gray-400 font-normal">/ 21</span></p>
                            </div>
                        )}
                        {s.stress_score !== null && (
                            <div>
                                <p className="text-xs text-gray-400">ความเครียด</p>
                                <p className="font-semibold text-gray-900">{s.stress_score} <span className="text-gray-400 font-normal">/ 12</span></p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Previous notes */}
            {c.notes && c.notes.length > 0 && (
                <div className="card space-y-3">
                    <h2 className="font-semibold text-gray-900 text-sm">บันทึกก่อนหน้า ({c.notes.length})</h2>
                    <div className="space-y-3">
                        {c.notes.map((n: { id: string; note: string; created_at: string }) => (
                            <div key={n.id} className="rounded-xl bg-gray-50 border border-[--color-border] px-4 py-3">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(n.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Case note form */}
            <CaseNoteForm caseId={c.id} />
        </div>
    )
}
