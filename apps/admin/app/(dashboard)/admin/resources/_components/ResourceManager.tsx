'use client'

import { useState, useTransition } from 'react'
import type { Resource } from '../../../../../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const CATEGORIES = ['stress', 'sleep', 'anxiety', 'academic', 'relationship', 'other']
const CATEGORY_LABELS: Record<string, string> = {
    stress: '😰 ความเครียด',
    sleep: '😴 การนอนหลับ',
    anxiety: '😟 ความวิตกกังวล',
    academic: '📚 การเรียน',
    relationship: '💞 ความสัมพันธ์',
    other: '📌 อื่นๆ',
}

interface Props {
    initialResources: Resource[]
}

const emptyForm = { title: '', category: 'stress', url: '', content_markdown: '', tags: '' }

export default function ResourceManager({ initialResources }: Props) {
    const [resources, setResources] = useState<Resource[]>(initialResources)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [filterCat, setFilterCat] = useState<string>('all')
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const filtered = filterCat === 'all' ? resources : resources.filter((r) => r.category === filterCat)

    const openCreate = () => {
        setEditId(null)
        setForm(emptyForm)
        setError(null)
        setShowForm(true)
    }

    const openEdit = (r: Resource) => {
        setEditId(r.id)
        setForm({ title: r.title, category: r.category, url: r.url ?? '', content_markdown: r.content_markdown ?? '', tags: r.tags.join(', ') })
        setError(null)
        setShowForm(true)
    }

    const handleSubmit = () => {
        if (!form.title.trim()) { setError('กรุณากรอกชื่อเนื้อหา'); return }
        startTransition(async () => {
            const payload = {
                title: form.title.trim(),
                category: form.category,
                url: form.url.trim() || null,
                content_markdown: form.content_markdown.trim() || null,
                tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
            }
            const method = editId ? 'PATCH' : 'POST'
            const url = editId ? `${API_BASE}/resources/${editId}` : `${API_BASE}/resources`

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            })
            if (!res.ok) { setError('บันทึกไม่สำเร็จ กรุณาลองใหม่'); return }
            const data: Resource = await res.json()

            if (editId) {
                setResources((prev) => prev.map((r) => (r.id === editId ? data : r)))
            } else {
                setResources((prev) => [data, ...prev])
            }
            setShowForm(false)
            setForm(emptyForm)
            setEditId(null)
        })
    }

    const handleToggle = (id: string, is_active: boolean) => {
        startTransition(async () => {
            const res = await fetch(`${API_BASE}/resources/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active }),
            })
            if (res.ok) {
                setResources((prev) => prev.map((r) => (r.id === id ? { ...r, is_active } : r)))
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm('ยืนยันการลบแหล่งช่วยเหลือนี้?')) return
        startTransition(async () => {
            await fetch(`${API_BASE}/resources/${id}`, { method: 'DELETE', credentials: 'include' })
            setResources((prev) => prev.filter((r) => r.id !== id))
        })
    }

    return (
        <div className="space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {['all', ...CATEGORIES].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCat(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterCat === cat
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                                }`}
                        >
                            {cat === 'all' ? 'ทั้งหมด' : CATEGORY_LABELS[cat]}
                        </button>
                    ))}
                </div>
                <button
                    onClick={openCreate}
                    className="btn-primary text-sm"
                >
                    + เพิ่มเนื้อหาใหม่
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-base font-bold text-gray-900">{editId ? 'แก้ไขเนื้อหา' : 'เพิ่มเนื้อหาใหม่'}</h2>
                        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

                        <div className="space-y-3">
                            <div>
                                <label className="label">หมวดหมู่</label>
                                <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">ชื่อเนื้อหา *</label>
                                <input className="input" placeholder="เช่น เทคนิคหายใจลดความเครียด" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label">URL (ถ้ามี)</label>
                                <input className="input" placeholder="https://..." type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label">เนื้อหา (Markdown)</label>
                                <textarea className="input min-h-[100px] resize-y" placeholder="รายละเอียด..." value={form.content_markdown} onChange={(e) => setForm((f) => ({ ...f, content_markdown: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label">Tags (คั่นด้วย , )</label>
                                <input className="input" placeholder="เช่น ผ่อนคลาย, หายใจ, ลดเครียด" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1 disabled:opacity-50">
                                {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                            <button onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary flex-1">
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resources List */}
            {filtered.length === 0 ? (
                <div className="card py-16 text-center text-gray-400">
                    <p className="text-sm">ยังไม่มีเนื้อหาในหมวดหมู่นี้</p>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden divide-y divide-[--color-border]">
                    {filtered.map((r) => (
                        <div key={r.id} className={`flex items-start gap-4 px-4 py-4 hover:bg-gray-50/50 ${!r.is_active ? 'opacity-50' : ''}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                        {CATEGORY_LABELS[r.category] ?? r.category}
                                    </span>
                                    {!r.is_active && (
                                        <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">ซ่อนอยู่</span>
                                    )}
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                                {r.url && <p className="text-xs text-brand-600 truncate mt-0.5">{r.url}</p>}
                                {r.tags.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">{r.tags.map((t) => `#${t}`).join(' ')}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleToggle(r.id, !r.is_active)}
                                    disabled={isPending}
                                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${r.is_active
                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {r.is_active ? 'เผยแพร่' : 'ซ่อน'}
                                </button>
                                <button onClick={() => openEdit(r)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                                    แก้ไข
                                </button>
                                <button onClick={() => handleDelete(r.id)} disabled={isPending} className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                                    ลบ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
