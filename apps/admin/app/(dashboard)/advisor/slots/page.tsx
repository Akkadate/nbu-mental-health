import { Metadata } from 'next'
import { getAdvisorySlotsApi } from '../../../../lib/api'
import SlotManager from './_components/SlotManager'

export const metadata: Metadata = { title: 'จัดการตารางเวลา' }

export default async function AdvisorSlotsPage() {
    const slots = await getAdvisorySlotsApi().catch(() => [])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">จัดการตารางเวลา</h1>
                <p className="text-sm text-gray-500 mt-0.5">เพิ่มหรือลบช่วงเวลาที่พร้อมให้นักศึกษานัดหมาย</p>
            </div>
            <SlotManager initialSlots={slots} />
        </div>
    )
}
