import { redirect } from 'next/navigation'
import { getSession } from '../../lib/auth'

export default async function DashboardRoot() {
    const session = await getSession()
    if (!session) redirect('/login')

    if (session.role === 'advisor') redirect('/advisor/appointments')
    if (session.role === 'counselor') redirect('/counselor/cases')
    if (session.role === 'admin') redirect('/admin/analytics')

    redirect('/login')
}
