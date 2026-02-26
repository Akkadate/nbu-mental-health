import { Metadata } from 'next'
import { getClinicalAppointmentsApi } from '../../../../lib/api'
import AppointmentTable from '../../advisor/appointments/_components/AppointmentTable'

export const metadata: Metadata = { title: 'นัดหมาย — นักจิตวิทยา' }

export default async function CounselorAppointmentsPage() {
    const appointments = await getClinicalAppointmentsApi().catch(() => [])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">นัดหมายของฉัน</h1>
                <p className="text-sm text-gray-500 mt-0.5">รายการนัดหมายนักศึกษากับนักจิตวิทยา</p>
            </div>
            <AppointmentTable appointments={appointments} />
        </div>
    )
}
