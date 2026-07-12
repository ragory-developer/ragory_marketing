import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'
import { ROUTE_ROLE_MAP, API_ROLE_MAP, type AppRole } from './lib/rbac'

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // ──────────────────────────────────────────
  // Public routes — no auth required
  // ──────────────────────────────────────────
  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname === '/'

  if (isPublic) {
    // Already logged in → redirect away from login/root
    if (token && (pathname.startsWith('/login') || pathname === '/')) {
      try {
        const payload = await verifyToken(token)
        if (payload) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } catch {
        // Token invalid, continue to login
      }
    }
    // No token on root → go to login
    if (!token && pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // ──────────────────────────────────────────
  // All other routes require a valid token
  // ──────────────────────────────────────────
  if (!token) {
    // API routes return 401 JSON instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }

  const role = (payload as any).role as AppRole

  // ──────────────────────────────────────────
  // API route-level RBAC
  // ──────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const apiRule = API_ROLE_MAP.find(r => pathname.startsWith(r.prefix))
    if (apiRule) {
      const methodOk = !apiRule.methods || apiRule.methods.includes(request.method)
      if (methodOk && !apiRule.allowed.includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    return NextResponse.next()
  }

  // ──────────────────────────────────────────
  // Page route-level RBAC
  // ──────────────────────────────────────────
  const routeRule = ROUTE_ROLE_MAP.find(r => pathname.startsWith(r.prefix))
  if (routeRule && !routeRule.allowed.includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
