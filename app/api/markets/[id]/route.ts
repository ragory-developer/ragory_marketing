import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  try {
    const market = await prisma.market.update({ where: { id }, data: { name: name.trim() } })
    return NextResponse.json(market)
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Market name already exists' }, { status: 400 })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  const count = await prisma.client.count({ where: { marketId: id } })
  if (count > 0) {
    return NextResponse.json({ error: 'Cannot delete: This market is assigned to clients' }, { status: 400 })
  }

  await prisma.market.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
