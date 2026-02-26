import { Metadata } from 'next'
import { getClinicalSlotsApi } from '../../../../lib/api'
import SlotManager from '../../advisor/slots/_components/SlotManager'

export const metadata: Metadata = { title: 'ตารางเวลา — นักจิตวิทยา' }

export default async function CounselorSlotsPage() {
    const slots = await getClinicalSlotsApi().catch(() => [])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">ตารางเวลาของฉัน</h1>
                <p className="text-sm text-gray-500 mt-0.5">จัดการช่วงเวลาให้คำปรึกษา</p>
            </div>
            <SlotManager initialSlots={slots} />
        </div>
    )
}
