import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    const method = request.method
    const path = request.nextUrl.pathname
    const methodColor = method === 'GET' ? '\x1b[32m' : method === 'POST' ? '\x1b[33m' : '\x1b[35m'
    console.log(`\x1b[90m[DEV]\x1b[0m ${methodColor}${method}\x1b[0m \x1b[36m${path}\x1b[0m`)
  }

  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Allow static assets, api/auth, and login page
  if (
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/login') ||
    pathname === '/' // assuming default page is handled or we just let it go and maybe it redirects to dashboard?
  ) {
    if (token && (pathname.startsWith('/login') || pathname === '/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // if root and no token, go to login
    if (!token && pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Verify token for all other routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }

  // Role based protection
  if (pathname.startsWith('/settings') || pathname.startsWith('/permissions')) {
    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
