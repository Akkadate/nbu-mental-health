import { Metadata } from 'next'
import LiffProvider from '../_components/LiffProvider'
import StaffLinkForm from './_components/StaffLinkForm'

export const metadata: Metadata = { title: 'เชื่อม LINE พนักงาน | NBU Mental Health' }

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_LINK_STAFF ?? ''

export default function LinkStaffPage() {
    return (
        <LiffProvider liffId={LIFF_ID}>
            <StaffLinkForm />
        </LiffProvider>
    )
}
