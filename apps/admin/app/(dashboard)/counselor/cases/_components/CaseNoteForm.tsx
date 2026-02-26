'use client'

import { useState, useTransition } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface CaseNoteFormProps {
    caseId: string
}

export default function CaseNoteForm({ caseId }: CaseNoteFormProps) {
    const [note, setNote] = useState('')
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!note.trim()) return

        setError(null)
        setSuccess(false)

        startTransition(async () => {
            try {
                const res = await fetch(`${API_BASE}/clinical/case-notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caseId, noteText: note }),
                    credentials: 'include',
                })
                if (!res.ok) throw new Error('Server error')
                setNote('')
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            } catch {
                setError('ไม่สามารถบันทึกโน้ตได้ กรุณาลองใหม่')
            }
        })
    }

    return (
        <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">บันทึกโน้ต (เข้ารหัส)</h2>
            <p className="text-xs text-gray-400 mb-4">
                โน้ตนี้จะถูกเข้ารหัส AES-256-GCM บนเซิร์ฟเวอร์ มองเห็นได้เฉพาะนักจิตวิทยาเท่านั้น
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
                )}
                {success && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                        ✅ บันทึกโน้ตเรียบร้อย
                    </p>
                )}

                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="พิมพ์โน้ตสำหรับเคสนี้..."
                    rows={5}
                    className="w-full border border-[--color-border] rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                    disabled={isPending}
                />

                <button
                    type="submit"
                    disabled={isPending || !note.trim()}
                    className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? 'กำลังบันทึก...' : '💾 บันทึกโน้ต'}
                </button>
            </form>
        </div>
    )
}
