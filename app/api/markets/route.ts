import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const { error } = await getAuthPayload()
  if (error) return error

  const markets = await prisma.market.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(markets)
}

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Only Super Admins can add markets' }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Market name is required' }, { status: 400 })

  try {
    const market = await prisma.market.create({ data: { name: name.trim() } })
    return NextResponse.json(market, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Market already exists' }, { status: 400 })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
