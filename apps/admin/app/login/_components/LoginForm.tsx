'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '../../_actions/auth'

const initialState: LoginState = {}

export default function LoginForm() {
    const [state, formAction, isPending] = useActionState(loginAction, initialState)

    return (
        <form action={formAction} className="space-y-4">
            {state.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {state.error}
                </div>
            )}

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    อีเมล
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[--color-border] bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                    placeholder="staff@northbkk.ac.th"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    รหัสผ่าน
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[--color-border] bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                    placeholder="••••••••"
                />
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
                {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        กำลังเข้าสู่ระบบ...
                    </span>
                ) : 'เข้าสู่ระบบ'}
            </button>
        </form>
    )
}
