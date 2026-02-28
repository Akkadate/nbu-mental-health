import { Metadata } from 'next'
import ChangePasswordForm from './_components/ChangePasswordForm'

export const metadata: Metadata = { title: 'เปลี่ยนรหัสผ่าน' }

export default function ChangePasswordPage() {
    return (
        <div className="max-w-md">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">เปลี่ยนรหัสผ่าน</h1>
                <p className="text-sm text-gray-500 mt-0.5">อัปเดตรหัสผ่านสำหรับบัญชีของคุณ</p>
            </div>
            <ChangePasswordForm />
        </div>
    )
}
