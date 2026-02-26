import { Metadata } from 'next'
import { getCasesApi } from '../../../../lib/api'
import CaseQueue from './_components/CaseQueue'

export const metadata: Metadata = { title: 'คิวเคส' }

export default async function CounselorCasesPage() {
    const cases = await getCasesApi('open').catch(() => [])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">คิวเคส</h1>
                <p className="text-sm text-gray-500 mt-0.5">เคสที่รอการดูแลจากนักจิตวิทยา</p>
            </div>
            <CaseQueue cases={cases} />
        </div>
    )
}
