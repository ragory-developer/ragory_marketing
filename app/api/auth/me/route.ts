import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'


export async function GET() {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token) as any
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const permissions = await prisma.permission.findMany({
    where: { userId: payload.userId }
  })

  return NextResponse.json({ 
    user: payload,
    permissions: permissions.map(p => p.navKey)
  })
}
