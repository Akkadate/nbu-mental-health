'use client'

export interface Question {
    id: number
    text: string
    options: { value: number; label: string }[]
}

interface QuestionCardProps {
    question: Question
    selectedValue: number | null
    onSelect: (value: number) => void
    questionIndex: number
    totalQuestions: number
}

export default function QuestionCard({
    question,
    selectedValue,
    onSelect,
    questionIndex,
    totalQuestions,
}: QuestionCardProps) {
    const progress = ((questionIndex) / totalQuestions) * 100

    return (
        <div className="card space-y-4">
            {/* Progress */}
            <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>ข้อ {questionIndex + 1} / {totalQuestions}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[--color-line-green] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Question text */}
            <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                {question.text}
            </p>

            {/* Options */}
            <div className="space-y-2">
                {question.options.map((opt) => {
                    const isSelected = selectedValue === opt.value
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onSelect(opt.value)}
                            aria-pressed={isSelected}
                            className={`likert-option w-full text-left text-sm transition-all ${isSelected ? 'selected' : ''
                                }`}
                        >
                            <span>{opt.label}</span>
                            {isSelected && (
                                <span className="text-[--color-line-green] font-bold">✓</span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
