import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token) as any
  if (!payload || payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  try {
    const market = await prisma.market.update({
      where: { id: params.id },
      data: { name: name.trim() }
    })
    return NextResponse.json(market)
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Market name already exists' }, { status: 400 })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token) as any
  if (!payload || payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Check if market is used by any clients
    const count = await prisma.client.count({ where: { marketId: params.id } })
    if (count > 0) {
      return NextResponse.json({ error: 'Cannot delete: This market is assigned to clients' }, { status: 400 })
    }

    await prisma.market.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
