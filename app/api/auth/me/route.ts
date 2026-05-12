import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  const token = cookies().get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  return NextResponse.json({ user: payload })
}
