import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { LoginSchema, zodError } from '@/lib/schemas'

export async function POST(req: Request) {
  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const result = LoginSchema.safeParse(body)
    if (!result.success) return zodError(result.error)
    const { username, password } = result.data

    const user = await prisma.user.findUnique({
      where: { username },
      include: { permissions: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({
      userId: user.id,
      role: user.role,
      permissions: user.permissions.map((p) => p.navKey),
    })

    ;(await cookies()).set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        permissions: user.permissions.map((p) => p.navKey),
      },
    })
  } catch (error) {
    console.error('[Login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
