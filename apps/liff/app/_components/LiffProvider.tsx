'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface LiffProfile {
    userId: string
    displayName: string
    pictureUrl?: string
}

interface LiffContextValue {
    isReady: boolean
    isLoggedIn: boolean
    profile: LiffProfile | null
    accessToken: string | null
    liffId: string
}

const LiffContext = createContext<LiffContextValue>({
    isReady: false,
    isLoggedIn: false,
    profile: null,
    accessToken: null,
    liffId: '',
})

export function useLiff() {
    return useContext(LiffContext)
}

interface LiffProviderProps {
    liffId: string
    children: React.ReactNode
}

export default function LiffProvider({ liffId, children }: LiffProviderProps) {
    const [state, setState] = useState<Omit<LiffContextValue, 'liffId'>>({
        isReady: false,
        isLoggedIn: false,
        profile: null,
        accessToken: null,
    })

    useEffect(() => {
        if (!liffId) return

        // Dynamically import LIFF to avoid SSR issues
        import('@line/liff').then(({ default: liff }) => {
            liff
                .init({ liffId })
                .then(async () => {
                    if (!liff.isLoggedIn()) {
                        liff.login()
                        return
                    }
                    const [profile, token] = await Promise.all([
                        liff.getProfile(),
                        Promise.resolve(liff.getAccessToken()),
                    ])
                    setState({
                        isReady: true,
                        isLoggedIn: true,
                        profile: {
                            userId: profile.userId,
                            displayName: profile.displayName,
                            pictureUrl: profile.pictureUrl,
                        },
                        accessToken: token,
                    })
                })
                .catch((err) => {
                    console.error('LIFF init failed', err)
                    setState((s) => ({ ...s, isReady: true }))
                })
        })
    }, [liffId])

    if (!state.isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[--color-line-green] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">กำลังโหลด LINE...</p>
                </div>
            </div>
        )
    }

    return (
        <LiffContext.Provider value={{ ...state, liffId }}>
            {children}
        </LiffContext.Provider>
    )
}
