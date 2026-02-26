import { notFound } from 'next/navigation'
import { getCaseByIdApi } from '../../../../../lib/api'
import CaseNoteForm from '../_components/CaseNoteForm'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    return { title: `เคส ${id.slice(0, 8)}` }
}

export default async function CaseDetailPage({ params }: Props) {
    const { id } = await params
    const c = await getCaseByIdApi(id).catch(() => null)
    if (!c) notFound()

    const priorityColor = c.priority === 'crisis' ? 'badge-crisis' : 'badge-high'

    return (
        <div className="max-w-2xl space-y-4">
            {/* Case header */}
            <div className="card">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">เคส #{c.id.slice(0, 8)}</p>
                        <h1 className="text-lg font-bold text-gray-900">รหัสนักศึกษา: {c.studentCode}</h1>
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
                            {new Date(c.createdAt).toLocaleDateString('th-TH', { dateStyle: 'short' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Case note form */}
            <CaseNoteForm caseId={c.id} />
        </div>
    )
}
