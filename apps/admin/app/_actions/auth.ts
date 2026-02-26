'use server'

import { redirect } from 'next/navigation'
import { loginApi } from '../../lib/api'
import { setSession, clearSession } from '../../lib/auth'

export interface LoginState {
    error?: string
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'กรุณากรอกอีเมลและรหัสผ่าน' }
    }

    try {
        const { token } = await loginApi(email, password)
        await setSession(token)
    } catch {
        return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
    }

    redirect('/')
}

export async function logoutAction(): Promise<void> {
    await clearSession()
    redirect('/login')
}
