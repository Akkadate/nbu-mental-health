'use client'

import { useState, useTransition } from 'react'
import type { Student, StudentsResponse } from '../../../../../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Props {
    initialData: StudentsResponse
    faculties: string[]
}

export default function StudentTable({ initialData, faculties }: Props) {
    const [data, setData] = useState<StudentsResponse>(initialData)
    const [search, setSearch] = useState('')
    const [faculty, setFaculty] = useState('')
    const [linked, setLinked] = useState('')
    const [isPending, startTransition] = useTransition()

    const fetchStudents = (params: {
        search?: string
        faculty?: string
        linked?: string
        page?: number
    }) => {
        startTransition(async () => {
            const q = new URLSearchParams()
            if (params.search) q.set('search', params.search)
            if (params.faculty) q.set('faculty', params.faculty)
            if (params.linked) q.set('linked', params.linked)
            if (params.page) q.set('page', String(params.page))
            q.set('limit', '50')

            const res = await fetch(`${API_BASE}/students?${q.toString()}`, {
                credentials: 'include',
            })
            if (res.ok) {
                setData(await res.json())
            }
        })
    }

    const handleSearch = () => {
        fetchStudents({ search, faculty, linked })
    }

    const handleReset = () => {
        setSearch('')
        setFaculty('')
        setLinked('')
        fetchStudents({})
    }

    const handlePage = (newPage: number) => {
        fetchStudents({ search, faculty, linked, page: newPage })
    }

    const totalPages = Math.ceil(data.total / data.limit)

    return (
        <div className="space-y-4">
            {/* Filter bar */}
            <div className="card">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">ค้นหารหัสนักศึกษา</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="เช่น 6501..."
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">คณะ</label>
                        <select
                            value={faculty}
                            onChange={(e) => setFaculty(e.target.value)}
                            className="input"
                        >
                            <option value="">ทั้งหมด</option>
                            {faculties.map((f) => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">สถานะ LINE</label>
                        <select
                            value={linked}
                            onChange={(e) => setLinked(e.target.value)}
                            className="input"
                        >
                            <option value="">ทั้งหมด</option>
                            <option value="yes">เชื่อมแล้ว</option>
                            <option value="no">ยังไม่เชื่อม</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSearch}
                        disabled={isPending}
                        className="btn-primary text-sm disabled:opacity-50"
                    >
                        {isPending ? 'กำลังค้นหา...' : 'ค้นหา'}
                    </button>
                    <button onClick={handleReset} className="btn-secondary text-sm">
                        รีเซ็ต
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="card py-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{data.total}</p>
                    <p className="text-xs text-gray-500 mt-0.5">ทั้งหมด</p>
                </div>
                <div className="card py-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                        {data.data.filter((s) => s.line_user_id).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">เชื่อม LINE แล้ว</p>
                </div>
                <div className="card py-3 text-center">
                    <p className="text-2xl font-bold text-amber-500">
                        {data.data.filter((s) => !s.line_user_id).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">ยังไม่เชื่อม</p>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-[--color-border] bg-gray-50/50">
                    <p className="text-sm font-medium text-gray-700">
                        แสดง {data.data.length} จาก {data.total} คน
                    </p>
                </div>

                {data.data.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-400">ไม่พบข้อมูลนักศึกษา</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[--color-border] bg-gray-50/50">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">รหัสนักศึกษา</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">คณะ</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">ชั้นปี</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">สถานะ LINE</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">เชื่อมเมื่อ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[--color-border]">
                                {data.data.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-mono text-sm text-gray-900">{s.student_code}</td>
                                        <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{s.faculty}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">ปี {s.year}</td>
                                        <td className="px-4 py-3 text-center">
                                            {s.line_user_id ? (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                                    ✓ เชื่อมแล้ว
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200">
                                                    ยังไม่เชื่อม
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {s.linked_at
                                                ? new Date(s.linked_at).toLocaleDateString('th-TH', { dateStyle: 'short' })
                                                : '—'
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => handlePage(data.page - 1)}
                        disabled={data.page <= 1 || isPending}
                        className="px-3 py-1.5 text-sm rounded-lg border border-[--color-border] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        ← ก่อนหน้า
                    </button>
                    <span className="text-sm text-gray-500">
                        หน้า {data.page} / {totalPages}
                    </span>
                    <button
                        onClick={() => handlePage(data.page + 1)}
                        disabled={data.page >= totalPages || isPending}
                        className="px-3 py-1.5 text-sm rounded-lg border border-[--color-border] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        ถัดไป →
                    </button>
                </div>
            )}
        </div>
    )
}
