import { Metadata } from 'next'
import { getResourcesApi } from '../../../../lib/api'
import ResourceManager from './_components/ResourceManager'

export const metadata: Metadata = { title: 'จัดการแหล่งช่วยเหลือ' }

export default async function AdminResourcesPage() {
    const resources = await getResourcesApi().catch(() => [])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">แหล่งช่วยเหลือตนเอง</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    จัดการเนื้อหาที่ bot LINE ส่งให้นักศึกษา (บทความ / ลิงก์ / แบบฝึกหัด)
                </p>
            </div>
            <ResourceManager initialResources={resources} />
        </div>
    )
}
