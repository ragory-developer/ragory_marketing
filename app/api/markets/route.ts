import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const token = cookies().get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const markets = await prisma.market.findMany({
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(markets)
}

export async function POST(req: NextRequest) {
  const token = cookies().get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only SUPER_ADMIN can add markets
  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Only Super Admins can add markets' }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Market name is required' }, { status: 400 })

  try {
    const market = await prisma.market.create({
      data: { name: name.trim() }
    })
    return NextResponse.json(market, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Market already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
