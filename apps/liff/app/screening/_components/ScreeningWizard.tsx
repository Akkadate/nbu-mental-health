'use client'

import { useState, useTransition } from 'react'
import { useLiff } from '../../_components/LiffProvider'
import QuestionCard, { Question } from './QuestionCard'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type SType = 'stress_mini' | 'phq9_gad7'
type Phase = 'select' | 'questions' | 'result'
type RiskLevel = 'low' | 'moderate' | 'high' | 'crisis'

// ─── ST-5 questions — 5 ข้อ คะแนน 0-4 ────────────────────────────────────────

const ST5_OPTIONS = [
    { value: 0, label: '0 – ไม่มีเลย' },
    { value: 1, label: '1 – น้อย' },
    { value: 2, label: '2 – ปานกลาง' },
    { value: 3, label: '3 – มาก' },
    { value: 4, label: '4 – มากที่สุด' },
]

const ST5_QUESTIONS: Question[] = [
    { id: 1, text: 'คุณรู้สึกไม่สบายใจ กังวลใจ หรือเป็นทุกข์กับเรื่องใดๆ ในช่วงนี้ไหม?', options: ST5_OPTIONS },
    { id: 2, text: 'คุณรู้สึกหงุดหงิด รำคาญใจในช่วงนี้ไหม?', options: ST5_OPTIONS },
    { id: 3, text: 'คุณรู้สึกเครียดสะสม หรือเครียดมากจนทนไม่ไหวในช่วงนี้ไหม?', options: ST5_OPTIONS },
    { id: 4, text: 'คุณมีปัญหาการนอน (นอนไม่หลับ หลับยาก หลับๆ ตื่นๆ) ในช่วงนี้ไหม?', options: ST5_OPTIONS },
    { id: 5, text: 'คุณรู้สึกเบื่อหน่าย หมดสนใจสิ่งที่เคยสนใจในช่วงนี้ไหม?', options: ST5_OPTIONS },
]

// ─── PHQ-9 questions — 9 ข้อ คะแนน 0-3 ──────────────────────────────────────

const PHQ9_OPTIONS = [
    { value: 0, label: '0 – ไม่มีเลย' },
    { value: 1, label: '1 – บางวัน' },
    { value: 2, label: '2 – บ่อยกว่าครึ่งของเวลา' },
    { value: 3, label: '3 – แทบทุกวัน' },
]

const PHQ9_QUESTIONS: Question[] = [
    { id: 1, text: 'รู้สึกหดหู่ใจ ซึมเศร้า หรือสิ้นหวัง', options: PHQ9_OPTIONS },
    { id: 2, text: 'มีความสนใจหรือความสุขในการทำกิจกรรมต่างๆ น้อยลง', options: PHQ9_OPTIONS },
    { id: 3, text: 'นอนไม่หลับ หลับยาก หรือหลับมากเกินไป', options: PHQ9_OPTIONS },
    { id: 4, text: 'รู้สึกเหนื่อยล้าหรือหมดแรง', options: PHQ9_OPTIONS },
    { id: 5, text: 'รับประทานอาหารน้อยลงหรือมากเกินไป', options: PHQ9_OPTIONS },
    { id: 6, text: 'รู้สึกแย่กับตัวเอง หรือรู้สึกว่าตัวเองล้มเหลว', options: PHQ9_OPTIONS },
    { id: 7, text: 'มีปัญหาสมาธิ เช่น การอ่านหนังสือหรือดูโทรทัศน์', options: PHQ9_OPTIONS },
    { id: 8, text: 'เคลื่อนไหวหรือพูดช้าลง หรือกระสับกระส่ายมากกว่าปกติ', options: PHQ9_OPTIONS },
    { id: 9, text: 'มีความคิดอยากทำร้ายตัวเองหรืออยากตาย', options: PHQ9_OPTIONS },
]

// ─── Risk config ──────────────────────────────────────────────────────────────

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

interface ScreeningResult {
    risk_level: string
    phq9_score: number | null
    gad7_score: number | null
    stress_score: number | null
    routing_suggestion: string
}

export default function ScreeningWizard() {
    const { profile, accessToken } = useLiff()
    const [phase, setPhase] = useState<Phase>('select')
    const [sType, setSType] = useState<SType | null>(null)
    const [qIdx, setQIdx] = useState(0)
    const [answers, setAnswers] = useState<Record<number, number>>({})
    const [result, setResult] = useState<ScreeningResult | null>(null)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')

    const questions = sType === 'stress_mini' ? ST5_QUESTIONS : PHQ9_QUESTIONS
    const currentQ = phase === 'questions' ? questions[qIdx] : null
    const isLast = qIdx === questions.length - 1

    const handleSelectType = (type: SType) => {
        setSType(type)
        setQIdx(0)
        setAnswers({})
        setError('')
        setPhase('questions')
    }

    const handleAnswer = (value: number) => {
        if (!currentQ) return
        setAnswers((prev) => ({ ...prev, [currentQ.id]: value }))
    }

    const handleNext = () => setQIdx((i) => i + 1)

    const handleBack = () => {
        if (qIdx === 0) {
            setPhase('select')
        } else {
            setQIdx((i) => i - 1)
        }
    }

    const handleSubmit = () => {
        setError('')
        startTransition(async () => {
            try {
                const resp = await fetch(`${API_BASE}/screenings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: JSON.stringify({
                        line_user_id: profile?.userId,
                        type: sType,
                        answers: questions.map((q) => ({
                            question_id: q.id,
                            score: answers[q.id] ?? 0,
                        })),
                    }),
                })
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}))
                    throw new Error(err.error ?? `HTTP ${resp.status}`)
                }
                const data: ScreeningResult = await resp.json()
                setResult(data)
                setPhase('result')
            } catch (err) {
                setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกผลได้ กรุณาลองใหม่')
            }
        })
    }

    // ─── Select type ─────────────────────────────────────────────────────────

    if (phase === 'select') {
        return (
            <div className="space-y-4">
                <div className="card text-center space-y-1">
                    <p className="text-sm font-semibold text-gray-700">เลือกแบบประเมินที่ต้องการ</p>
                    <p className="text-xs text-gray-400">คำตอบของคุณจะถูกเก็บเป็นความลับ</p>
                </div>

                <button
                    type="button"
                    className="card w-full text-left space-y-1.5 hover:border-[--color-line-green] transition-colors active:scale-[0.98]"
                    onClick={() => handleSelectType('stress_mini')}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">ประเมินเร็ว — ST-5</p>
                            <p className="text-xs text-gray-500">5 ข้อ · ใช้เวลาประมาณ 1 นาที</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 pl-9">วัดระดับความเครียดทั่วไป (มาตรฐานกรมสุขภาพจิต)</p>
                </button>

                <button
                    type="button"
                    className="card w-full text-left space-y-1.5 hover:border-[--color-line-green] transition-colors active:scale-[0.98]"
                    onClick={() => handleSelectType('phq9_gad7')}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">ประเมินเต็ม — PHQ-9</p>
                            <p className="text-xs text-gray-500">9 ข้อ · ใช้เวลาประมาณ 2 นาที</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 pl-9">วัดอาการซึมเศร้า (แบบมาตรฐานสากล)</p>
                </button>
            </div>
        )
    }

    // ─── Questions ───────────────────────────────────────────────────────────

    if (phase === 'questions' && currentQ) {
        const currentAnswer = answers[currentQ.id] ?? null

        return (
            <div className="space-y-4">
                {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
                <QuestionCard
                    question={currentQ}
                    selectedValue={currentAnswer}
                    onSelect={handleAnswer}
                    questionIndex={qIdx}
                    totalQuestions={questions.length}
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

    if (phase === 'result' && result) {
        const risk = (result.risk_level as RiskLevel) in RISK_CONFIG
            ? (result.risk_level as RiskLevel)
            : 'low'
        const config = RISK_CONFIG[risk]
        const scoreLabel = sType === 'stress_mini'
            ? `คะแนน ST-5: ${result.stress_score ?? 0} / 20`
            : `คะแนน PHQ-9: ${result.phq9_score ?? 0} / 27`

        return (
            <div className="card text-center space-y-4">
                <div className="text-5xl">{config.emoji}</div>
                <div>
                    <p className="text-xs text-gray-400 mb-1">{scoreLabel}</p>
                    <h2 className={`text-lg font-bold ${config.className}`}>{config.label}</h2>
                </div>
                <p className="text-sm text-gray-600">{result.routing_suggestion || config.message}</p>
                {risk !== 'low' && (
                    <a href="/booking?type=counselor" className="btn-line">
                        📅 นัดพบนักจิตวิทยา
                    </a>
                )}
            </div>
        )
    }

    return null
}
