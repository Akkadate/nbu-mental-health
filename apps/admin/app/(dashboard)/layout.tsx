import { redirect } from 'next/navigation'
import { getSession } from '../../lib/auth'
import Sidebar from './_components/Sidebar'
import Topbar from './_components/Topbar'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()
    if (!session) {
        redirect('/login')
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[--color-surface]">
            <Sidebar role={session.role} />

            <div className="flex flex-col flex-1 overflow-hidden">
                <Topbar name={session.name} role={session.role} />

                <main className="flex-1 overflow-y-auto p-6 bg-[--color-surface]">
                    {children}
                </main>
            </div>
        </div>
    )
}
