'use client'

import { useState, useTransition, useRef } from 'react'
import type { Student, StudentsResponse } from '../../../../../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Props {
    initialData: StudentsResponse
    faculties: string[]
}

interface EditForm {
    faculty: string
    year: string
    status: 'active' | 'inactive'
    dob: string
    id_card: string
    passport_no: string
}

interface ImportResult {
    inserted: number
    updated: number
    errors: string[]
}

const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { dateStyle: 'short' }) : '—'

const fmtDob = (d: string | null) => {
    if (!d) return '—'
    // d is YYYY-MM-DD from postgres date
    const [y, m, day] = d.split('T')[0].split('-')
    return `${day}/${m}/${y}`
}

export default function StudentTable({ initialData, faculties: initialFaculties }: Props) {
    const [data, setData] = useState<StudentsResponse>(initialData)
    const [faculties, setFaculties] = useState<string[]>(initialFaculties)

    // Filter
    const [search, setSearch] = useState('')
    const [faculty, setFaculty] = useState('')
    const [linked, setLinked] = useState('')

    // Edit modal
    const [editStudent, setEditStudent] = useState<Student | null>(null)
    const [editForm, setEditForm] = useState<EditForm>({
        faculty: '', year: '1', status: 'active',
        dob: '', id_card: '', passport_no: '',
    })
    const [editError, setEditError] = useState<string | null>(null)

    // Import modal
    const [showImport, setShowImport] = useState(false)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)

    const [isPending, startTransition] = useTransition()

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchStudents = (params: { search?: string; faculty?: string; linked?: string; page?: number }) => {
        startTransition(async () => {
            const q = new URLSearchParams()
            if (params.search) q.set('search', params.search)
            if (params.faculty) q.set('faculty', params.faculty)
            if (params.linked) q.set('linked', params.linked)
            if (params.page) q.set('page', String(params.page))
            q.set('limit', '50')
            const res = await fetch(`${API_BASE}/students?${q.toString()}`, { credentials: 'include' })
            if (res.ok) setData(await res.json())
        })
    }

    const refreshFaculties = async () => {
        const res = await fetch(`${API_BASE}/students/faculties`, { credentials: 'include' })
        if (res.ok) setFaculties(await res.json())
    }

    // ── Filter ────────────────────────────────────────────────────────────────

    const handleSearch = () => fetchStudents({ search, faculty, linked })
    const handleReset = () => {
        setSearch(''); setFaculty(''); setLinked('')
        fetchStudents({})
    }
    const handlePage = (p: number) => fetchStudents({ search, faculty, linked, page: p })

    // ── Edit ──────────────────────────────────────────────────────────────────

    const openEdit = (s: Student) => {
        setEditStudent(s)
        setEditForm({
            faculty: s.faculty,
            year: String(s.year),
            status: s.status,
            dob: s.dob ? s.dob.split('T')[0] : '',
            id_card: s.id_card ?? '',
            passport_no: s.passport_no ?? '',
        })
        setEditError(null)
    }

    const handleEditSave = () => {
        if (!editStudent) return
        const yr = parseInt(editForm.year, 10)
        if (isNaN(yr) || yr < 1 || yr > 10) { setEditError('ชั้นปีต้องเป็น 1–10'); return }
        startTransition(async () => {
            const payload: Record<string, unknown> = {
                faculty: editForm.faculty,
                year: yr,
                status: editForm.status,
                dob: editForm.dob || null,
                id_card: editForm.id_card || null,
                passport_no: editForm.passport_no || null,
            }
            const res = await fetch(`${API_BASE}/students/${editStudent.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                setEditError(body.error ?? 'บันทึกไม่สำเร็จ')
                return
            }
            const updated: Student = await res.json()
            setData((prev) => ({
                ...prev,
                data: prev.data.map((s) => s.id === updated.id ? { ...s, ...updated } : s),
            }))
            await refreshFaculties()
            setEditStudent(null)
        })
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDelete = (s: Student) => {
        if (!confirm(`ยืนยันการลบนักศึกษา "${s.student_code}"?\nข้อมูลการเชื่อม LINE จะถูกลบด้วย`)) return
        startTransition(async () => {
            const res = await fetch(`${API_BASE}/students/${s.id}`, {
                method: 'DELETE', credentials: 'include',
            })
            if (res.ok || res.status === 204) {
                setData((prev) => ({
                    ...prev,
                    data: prev.data.filter((x) => x.id !== s.id),
                    total: prev.total - 1,
                }))
            }
        })
    }

    // ── Import ────────────────────────────────────────────────────────────────

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsImporting(true)
        setImportResult(null)
        try {
            const csv = await file.text()
            const res = await fetch(`${API_BASE}/students/import`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv }),
            })
            const result: ImportResult = await res.json()
            setImportResult(result)
            await refreshFaculties()
            fetchStudents({ search, faculty, linked })
        } catch {
            setImportResult({ inserted: 0, updated: 0, errors: ['เกิดข้อผิดพลาดในการอัปโหลด'] })
        } finally {
            setIsImporting(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const totalPages = Math.ceil(data.total / data.limit)

    return (
        <div className="space-y-4">

            {/* ── Filter bar ────────────────────────────────────────── */}
            <div className="card">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">ค้นหารหัสนักศึกษา</label>
                        <input
                            type="text" value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="เช่น 6501..." className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">คณะ</label>
                        <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="input">
                            <option value="">ทั้งหมด</option>
                            {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">สถานะ LINE</label>
                        <select value={linked} onChange={(e) => setLinked(e.target.value)} className="input">
                            <option value="">ทั้งหมด</option>
                            <option value="yes">เชื่อมแล้ว</option>
                            <option value="no">ยังไม่เชื่อม</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleSearch} disabled={isPending} className="btn-primary text-sm disabled:opacity-50">
                        {isPending ? 'กำลังค้นหา...' : 'ค้นหา'}
                    </button>
                    <button onClick={handleReset} className="btn-secondary text-sm">รีเซ็ต</button>
                    <button
                        onClick={() => { setImportResult(null); setShowImport(true) }}
                        className="btn-secondary text-sm ml-auto"
                    >
                        ↑ นำเข้า CSV
                    </button>
                </div>
            </div>

            {/* ── Stats ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card py-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{data.total}</p>
                    <p className="text-xs text-gray-500 mt-0.5">ทั้งหมด</p>
                </div>
                <div className="card py-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{data.data.filter((s) => s.line_user_id).length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">เชื่อม LINE</p>
                </div>
                <div className="card py-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.data.filter((s) => s.has_dob).length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">มีข้อมูลวันเกิด</p>
                </div>
                <div className="card py-3 text-center">
                    <p className="text-2xl font-bold text-amber-500">{data.data.filter((s) => !s.line_user_id).length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">ยังไม่เชื่อม</p>
                </div>
            </div>

            {/* ── Table ─────────────────────────────────────────────── */}
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
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">รหัสนักศึกษา</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">คณะ</th>
                                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">ปี</th>
                                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">สถานะ</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">วันเกิด</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">เลขบัตร ปชช.</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Passport</th>
                                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">LINE</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">เชื่อมเมื่อ</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">สร้างเมื่อ</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[--color-border]">
                                {data.data.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-mono text-sm text-gray-900 whitespace-nowrap">{s.student_code}</td>
                                        <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate" title={s.faculty}>{s.faculty}</td>
                                        <td className="px-3 py-3 text-center text-gray-600">{s.year}</td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border font-medium ${s.status === 'active'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                {s.status === 'active' ? 'ใช้งาน' : 'ปิดใช้'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{fmtDob(s.dob)}</td>
                                        <td className="px-3 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                                            {s.id_card ?? <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                                            {s.passport_no ?? <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {s.line_user_id ? (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                                                    ✓ เชื่อม
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 whitespace-nowrap">ยังไม่เชื่อม</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(s.linked_at)}</td>
                                        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(s.created_at)}</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEdit(s)}
                                                    disabled={isPending}
                                                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                >
                                                    แก้ไข
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(s)}
                                                    disabled={isPending}
                                                    className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    ลบ
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Pagination ────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => handlePage(data.page - 1)}
                        disabled={data.page <= 1 || isPending}
                        className="px-3 py-1.5 text-sm rounded-lg border border-[--color-border] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >← ก่อนหน้า</button>
                    <span className="text-sm text-gray-500">หน้า {data.page} / {totalPages}</span>
                    <button
                        onClick={() => handlePage(data.page + 1)}
                        disabled={data.page >= totalPages || isPending}
                        className="px-3 py-1.5 text-sm rounded-lg border border-[--color-border] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >ถัดไป →</button>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────────────── */}
            {editStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-base font-bold text-gray-900">แก้ไขข้อมูล — {editStudent.student_code}</h2>
                        {editError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
                        )}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">คณะ *</label>
                                <input
                                    className="input"
                                    value={editForm.faculty}
                                    onChange={(e) => setEditForm((f) => ({ ...f, faculty: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ชั้นปี (1–10) *</label>
                                    <input
                                        className="input" type="number" min={1} max={10}
                                        value={editForm.year}
                                        onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">สถานะ</label>
                                    <select
                                        className="input" value={editForm.status}
                                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                                    >
                                        <option value="active">ใช้งาน</option>
                                        <option value="inactive">ปิดใช้</option>
                                    </select>
                                </div>
                            </div>
                            <hr className="border-gray-100" />
                            <p className="text-xs text-gray-400">ข้อมูลยืนยันตัวตน (ใช้สำหรับ link LINE)</p>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">วันเกิด</label>
                                <input
                                    className="input" type="date"
                                    value={editForm.dob}
                                    onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">เลขบัตรประชาชน (13 หลัก)</label>
                                <input
                                    className="input font-mono" maxLength={13}
                                    placeholder="1234567890123"
                                    value={editForm.id_card}
                                    onChange={(e) => setEditForm((f) => ({ ...f, id_card: e.target.value.replace(/\D/g, '') }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">เลข Passport</label>
                                <input
                                    className="input font-mono" maxLength={20}
                                    placeholder="AA1234567"
                                    value={editForm.passport_no}
                                    onChange={(e) => setEditForm((f) => ({ ...f, passport_no: e.target.value.toUpperCase() }))}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={handleEditSave} disabled={isPending} className="btn-primary flex-1 disabled:opacity-50">
                                {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                            <button onClick={() => setEditStudent(null)} className="btn-secondary flex-1">ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Import CSV Modal ──────────────────────────────────── */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-base font-bold text-gray-900">นำเข้านักศึกษาจาก CSV</h2>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 space-y-1.5">
                            <p className="font-semibold text-gray-700">รูปแบบ CSV (หัวคอลัมน์บรรทัดแรก):</p>
                            <code className="block font-mono bg-white border border-gray-200 rounded px-2 py-1.5 text-gray-800 select-all text-[11px] leading-relaxed">
                                student_code,faculty,year,status,dob,id_card,passport_no
                            </code>
                            <ul className="space-y-0.5 text-gray-500">
                                <li>• <b>status</b>, <b>dob</b>, <b>id_card</b>, <b>passport_no</b> ไม่จำเป็น</li>
                                <li>• status ค่าเริ่มต้น: <b>active</b></li>
                                <li>• dob รูปแบบ: <b>YYYY-MM-DD</b> เช่น 2002-05-15</li>
                                <li>• ถ้ารหัสซ้ำ → <b>อัปเดต</b> ข้อมูลทั้งหมด</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">เลือกไฟล์ CSV</label>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleImportFile}
                                disabled={isImporting}
                                className="block w-full text-sm text-gray-600
                                    file:mr-3 file:py-1.5 file:px-3 file:rounded-lg
                                    file:border file:border-gray-200 file:text-xs file:font-medium
                                    file:text-gray-700 file:bg-gray-50 hover:file:bg-gray-100
                                    cursor-pointer disabled:opacity-50"
                            />
                        </div>

                        {isImporting && (
                            <p className="text-sm text-gray-500 text-center animate-pulse">กำลังนำเข้า...</p>
                        )}

                        {importResult && (
                            <div className={`rounded-lg border px-4 py-3 space-y-2 ${importResult.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="flex gap-4 text-sm font-medium text-gray-800">
                                    <span>เพิ่มใหม่ <b className="text-green-700">{importResult.inserted}</b> รายการ</span>
                                    <span>อัปเดต <b className="text-blue-700">{importResult.updated}</b> รายการ</span>
                                </div>
                                {importResult.errors.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-amber-700 mb-1">ข้อผิดพลาด {importResult.errors.length} แถว:</p>
                                        <ul className="space-y-0.5 max-h-36 overflow-y-auto">
                                            {importResult.errors.map((e, i) => (
                                                <li key={i} className="text-xs text-amber-800">• {e}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={() => setShowImport(false)} className="btn-secondary w-full">ปิด</button>
                    </div>
                </div>
            )}
        </div>
    )
}
