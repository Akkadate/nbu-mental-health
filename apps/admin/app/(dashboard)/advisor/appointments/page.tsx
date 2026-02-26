import { Metadata } from 'next'
import { Suspense } from 'react'
import { getAdvisoryAppointmentsApi } from '../../../../lib/api'
import AppointmentTable from './_components/AppointmentTable'

export const metadata: Metadata = { title: 'นัดหมายของฉัน' }

export default async function AdvisorAppointmentsPage() {
    const appointments = await getAdvisoryAppointmentsApi().catch(() => [])

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">นัดหมายของฉัน</h1>
                    <p className="text-sm text-gray-500 mt-0.5">รายการนัดหมายนักศึกษากับอาจารย์ที่ปรึกษา</p>
                </div>
            </div>

            <Suspense fallback={<div className="card animate-pulse h-64" />}>
                <AppointmentTable appointments={appointments} />
            </Suspense>
        </div>
    )
}
