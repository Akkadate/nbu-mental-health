'use client'

import { useState, useTransition } from 'react'
import { useLiff } from '../../_components/LiffProvider'
import QuestionCard, { Question } from './QuestionCard'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

// PHQ-9 questions (Thai)
const QUESTIONS: Question[] = [
    {
        id: 1,
        text: 'รู้สึกหดหู่ใจ ซึมเศร้า หรือสิ้นหวัง',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 2,
        text: 'มีความสนใจหรือความสุขในการทำกิจกรรมต่าง ๆ น้อยลง',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 3,
        text: 'นอนไม่หลับ หลับยาก หรือหลับมากเกินไป',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 4,
        text: 'รู้สึกเหนื่อยล้าหรือหมดแรง',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 5,
        text: 'รับประทานอาหารน้อยลงหรือมากเกินไป',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 6,
        text: 'รู้สึกแย่กับตัวเอง หรือรู้สึกว่าตัวเองล้มเหลว',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 7,
        text: 'มีปัญหาสมาธิ เช่น การอ่านหนังสือหรือดูโทรทัศน์',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 8,
        text: 'เคลื่อนไหวหรือพูดช้าลง หรือกระสับกระส่ายมากกว่าปกติ',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
    {
        id: 9,
        text: 'มีความคิดอยากทำร้ายตัวเองหรืออยากตาย',
        options: [
            { value: 0, label: '0 – ไม่มีเลย' },
            { value: 1, label: '1 – บางวัน' },
            { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
            { value: 3, label: '3 – แทบทุกวัน' },
        ],
    },
]

type RiskLevel = 'low' | 'moderate' | 'high' | 'crisis'

function getRiskLevel(total: number, hasCrisis: boolean): RiskLevel {
    if (hasCrisis) return 'crisis'
    if (total <= 4) return 'low'
    if (total <= 9) return 'moderate'
    if (total <= 14) return 'high'
    return 'crisis'
}

const RISK_CONFIG: Record<RiskLevel, { label: string; emoji: string; message: string; className: string }> = {
    low: {
        label: 'ความเสี่ยงต่ำ',
        emoji: '😊',
        message: 'สุขภาพจิตของคุณอยู่ในเกณฑ์ดี ดูแลตัวเองต่อไปนะ',
        className: 'risk-low',
    },
    moderate: {
        label: 'ความเสี่ยงปานกลาง',
        emoji: '😐',
        message: 'แนะนำให้ปรึกษาอาจารย์ที่ปรึกษาเพื่อขอคำแนะนำ',
        className: 'risk-mod',
    },
    high: {
        label: 'ความเสี่ยงสูง',
        emoji: '😟',
        message: 'ควรพบผู้เชี่ยวชาญด้านสุขภาพจิตของมหาวิทยาลัย',
        className: 'risk-high',
    },
    crisis: {
        label: 'ต้องการความช่วยเหลือด่วน',
        emoji: '🆘',
        message: 'กรุณาติดต่อสายด่วนสุขภาพจิต 1323 หรือขอความช่วยเหลือทันที',
        className: 'risk-crisis',
    },
}

export default function ScreeningWizard() {
    const { profile, accessToken } = useLiff()
    const [answers, setAnswers] = useState<Record<number, number>>({})
    const [step, setStep] = useState(0) // 0 = intro
    const [submitted, setSubmitted] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')

    const totalQ = QUESTIONS.length
    // step 0 = intro, steps 1..totalQ = questions, step totalQ+1 = result
    const currentQuestion = step >= 1 && step <= totalQ ? QUESTIONS[step - 1] : null

    const handleAnswer = (value: number) => {
        const q = QUESTIONS[step - 1]
        setAnswers((prev) => ({ ...prev, [q.id]: value }))
    }

    const handleNext = () => {
        setStep((s) => s + 1)
    }

    const handleBack = () => {
        setStep((s) => Math.max(0, s - 1))
    }

    const handleSubmit = () => {
        const scores = QUESTIONS.map((q) => answers[q.id] ?? 0)
        const total = scores.reduce((a, b) => a + b, 0)
        const hasCrisis = (answers[9] ?? 0) > 0
        const riskLevel = getRiskLevel(total, hasCrisis)

        startTransition(async () => {
            try {
                await fetch(`${API_BASE}/screenings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: JSON.stringify({
                        line_user_id: profile?.userId,
                        instrument: 'PHQ-9',
                        answers: QUESTIONS.map((q) => ({
                            question_id: q.id,
                            score: answers[q.id] ?? 0,
                        })),
                        total_score: total,
                        risk_level: riskLevel,
                    }),
                })
            } catch {
                setError('ไม่สามารถบันทึกผลได้ แต่คุณสามารถดูผลการประเมินได้ด้านล่าง')
            }
            setSubmitted(true)
            setStep(totalQ + 1)
        })
    }

    // ─── Intro ───────────────────────────────────────────────────────────────
    if (step === 0) {
        return (
            <div className="card space-y-5 text-center">
                <div className="text-4xl">📋</div>
                <div>
                    <h2 className="font-bold text-gray-900 mb-1">แบบประเมิน PHQ-9</h2>
                    <p className="text-sm text-gray-500">คำถาม {totalQ} ข้อ ใช้เวลาประมาณ 2 นาที</p>
                </div>
                <ul className="text-sm text-gray-600 text-left list-disc list-inside space-y-1">
                    <li>ไม่มีคำตอบถูกหรือผิด</li>
                    <li>คำตอบของคุณจะถูกเก็บเป็นความลับ</li>
                    <li>ผลจะส่งให้ผู้เชี่ยวชาญโดยอัตโนมัติ</li>
                </ul>
                <button type="button" className="btn-line" onClick={() => setStep(1)}>
                    🚀 เริ่มประเมิน
                </button>
            </div>
        )
    }

    // ─── Questions ───────────────────────────────────────────────────────────
    if (currentQuestion) {
        const currentAnswer = answers[currentQuestion.id] ?? null
        const isLast = step === totalQ

        return (
            <div className="space-y-4">
                <QuestionCard
                    question={currentQuestion}
                    selectedValue={currentAnswer}
                    onSelect={handleAnswer}
                    questionIndex={step - 1}
                    totalQuestions={totalQ}
                />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 py-3 rounded-xl border border-[--color-border] text-sm font-medium text-gray-600 bg-white"
                    >
                        ← ย้อนกลับ
                    </button>
                    <button
                        type="button"
                        disabled={currentAnswer === null || isPending}
                        onClick={isLast ? handleSubmit : handleNext}
                        className="flex-[2] btn-line"
                    >
                        {isPending ? 'กำลังบันทึก...' : isLast ? '✅ ส่งผลประเมิน' : 'ถัดไป →'}
                    </button>
                </div>
            </div>
        )
    }

    // ─── Result ──────────────────────────────────────────────────────────────
    if (submitted || step > totalQ) {
        const scores = QUESTIONS.map((q) => answers[q.id] ?? 0)
        const total = scores.reduce((a, b) => a + b, 0)
        const hasCrisis = (answers[9] ?? 0) > 0
        const risk = getRiskLevel(total, hasCrisis)
        const config = RISK_CONFIG[risk]

        return (
            <div className="space-y-4">
                {error && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                        {error}
                    </div>
                )}
                <div className="card text-center space-y-4">
                    <div className="text-5xl">{config.emoji}</div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">คะแนนรวม {total} / 27</p>
                        <h2 className={`text-lg font-bold ${config.className}`}>{config.label}</h2>
                    </div>
                    <p className="text-sm text-gray-600">{config.message}</p>
                    {risk !== 'low' && (
                        <a
                            href={`/booking?type=counselor`}
                            className="btn-line"
                        >
                            📅 นัดพบนักจิตวิทยา
                        </a>
                    )}
                </div>
            </div>
        )
    }

    return null
}
