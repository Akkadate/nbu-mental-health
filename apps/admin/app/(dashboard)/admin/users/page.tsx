import { Metadata } from 'next'
import { getStaffUsersApi } from '../../../../lib/api'
import UserTable from './_components/UserTable'

export const metadata: Metadata = { title: 'จัดการผู้ใช้งาน' }

export default async function AdminUsersPage() {
    const users = await getStaffUsersApi().catch(() => [])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">จัดการบัญชีพนักงาน</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    เพิ่ม / ปิดใช้งาน บัญชีอาจารย์ที่ปรึกษา, นักจิตวิทยา, และผู้ดูแลระบบ
                </p>
            </div>
            <UserTable initialUsers={users} />
        </div>
    )
}
