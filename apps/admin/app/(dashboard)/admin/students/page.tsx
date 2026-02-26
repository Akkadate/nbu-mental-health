import { Metadata } from 'next'
import { getStudentsApi, getStudentFacultiesApi } from '../../../../lib/api'
import StudentTable from './_components/StudentTable'

export const metadata: Metadata = { title: 'รายชื่อนักศึกษา' }

export default async function AdminStudentsPage() {
    const [res, faculties] = await Promise.all([
        getStudentsApi({ limit: 50 }).catch(() => ({ data: [], total: 0, page: 1, limit: 50 })),
        getStudentFacultiesApi().catch(() => [] as string[]),
    ])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">รายชื่อนักศึกษา</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    นักศึกษาทั้งหมด {res.total} คน — แสดงเฉพาะรหัส, คณะ, สถานะการเชื่อม LINE
                </p>
            </div>
            <StudentTable initialData={res} faculties={faculties} />
        </div>
    )
}
