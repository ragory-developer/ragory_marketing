import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Public routes: auth APIs and login page
  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname === '/'

  if (isPublic) {
    // If already logged in, redirect away from login/root
    if (token && (pathname.startsWith('/login') || pathname === '/')) {
      try {
        const payload = await verifyToken(token)
        if (payload) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } catch (e) {
        // Token invalid, continue to login
      }
    }
    // No token and on root → go to login
    if (!token && pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // All other routes require a valid token
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }

  // Role-based protection for admin-only pages
  if (pathname.startsWith('/settings') || pathname.startsWith('/permissions')) {
    if ((payload as any).role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
