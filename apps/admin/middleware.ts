import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeToken } from './lib/auth'

const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip public paths
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next()
    }

    const token = request.cookies.get('nbu_session')?.value

    // Redirect to login if no session
    if (!token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Decode to check role
    const session = decodeToken(token)
    if (!session) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    // Role-based route protection
    if (pathname.startsWith('/advisor') && session.role !== 'advisor') {
        return NextResponse.redirect(new URL('/', request.url))
    }
    if (pathname.startsWith('/counselor') && session.role !== 'counselor') {
        return NextResponse.redirect(new URL('/', request.url))
    }
    if (pathname.startsWith('/admin') && session.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
