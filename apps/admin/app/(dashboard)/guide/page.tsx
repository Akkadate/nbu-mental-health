import { Metadata } from 'next'
import { getSession } from '../../../lib/auth'
import GuideContent from './_components/GuideContent'

export const metadata: Metadata = {
    title: 'คู่มือการใช้งาน',
}

export default async function GuidePage() {
    const session = await getSession()
    const role = (session?.role ?? 'advisor') as 'advisor' | 'counselor' | 'admin'
    return <GuideContent defaultRole={role} />
}
