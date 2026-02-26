'use client'

import type { FacultyHeatmapRow } from '../../../../../lib/api'

interface FacultyHeatmapProps {
    rows: FacultyHeatmapRow[]
}

function getHeat(value: number, max: number) {
    if (max === 0) return 0
    return Math.round((value / max) * 5)
}

const heatColor = [
    'bg-gray-100',
    'bg-green-100',
    'bg-yellow-100',
    'bg-orange-100',
    'bg-red-100',
    'bg-red-300',
]

export default function FacultyHeatmap({ rows }: FacultyHeatmapProps) {
    if (rows.length === 0) {
        return (
            <div className="card text-center py-12 text-gray-400">
                <p className="text-sm">ไม่มีข้อมูล heatmap</p>
            </div>
        )
    }

    const maxCrisis = Math.max(...rows.map((r) => r.crisis), 1)
    const maxHigh = Math.max(...rows.map((r) => r.high), 1)

    return (
        <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[--color-border] bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-700">Heatmap ความเสี่ยงตามคณะ</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[--color-border] bg-gray-50/50">
                            <th className="text-left px-4 py-3 font-medium text-gray-600">คณะ</th>
                            <th className="text-center px-3 py-3 font-medium text-gray-600">🌿 ต่ำ</th>
                            <th className="text-center px-3 py-3 font-medium text-gray-600">💛 ปานกลาง</th>
                            <th className="text-center px-3 py-3 font-medium text-gray-600">🧡 สูง</th>
                            <th className="text-center px-3 py-3 font-medium text-gray-600">🚨 วิกฤต</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[--color-border]">
                        {rows.map((row) => (
                            <tr key={row.faculty} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-medium text-gray-800">{row.faculty}</td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-block w-10 h-7 rounded text-xs font-medium flex items-center justify-center ${heatColor[getHeat(row.low, maxHigh)]}`}>
                                        {row.low}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-block w-10 h-7 rounded text-xs font-medium flex items-center justify-center ${heatColor[getHeat(row.moderate, maxHigh)]}`}>
                                        {row.moderate}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-block w-10 h-7 rounded text-xs font-medium flex items-center justify-center ${heatColor[getHeat(row.high, maxHigh)]}`}>
                                        {row.high}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-block w-10 h-7 rounded text-xs font-semibold flex items-center justify-center ${heatColor[getHeat(row.crisis, maxCrisis)]}`}>
                                        {row.crisis}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
