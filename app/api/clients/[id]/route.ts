import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NoteType } from '@prisma/client'

async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      createdBy:  { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      market:     true,
      clientNotes: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await getClient(id)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, shopName, address, alternativePhone, email, businessType, district, area, status, priority, source, notes, assignedToId, nextFollowUpAt, rating, marketId, facebookUrl } = body

  const current = await prisma.client.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Detect changes for history tracking
  const notes_to_add = []
  if (status && status !== current.status) {
    notes_to_add.push({ content: `Status changed from ${current.status} to ${status}`, type: NoteType.GENERAL, author: { connect: { id: (payload as any).userId } } })
  }
  if (priority && priority !== current.priority) {
    notes_to_add.push({ content: `Priority changed from ${current.priority} to ${priority}`, type: NoteType.GENERAL, author: { connect: { id: (payload as any).userId } } })
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(name              !== undefined && { name }),
      ...(phone             !== undefined && { phone }),
      ...(shopName          !== undefined && { shopName }),
      ...(address           !== undefined && { address }),
      ...(alternativePhone  !== undefined && { alternativePhone }),
      ...(email             !== undefined && { email }),
      ...(businessType      !== undefined && { businessType }),
      ...(district          !== undefined && { district }),
      ...(area              !== undefined && { area }),
      ...(status            !== undefined && { status }),
      ...(priority          !== undefined && { priority }),
      ...(source            !== undefined && { source }),
      ...(notes             !== undefined && { notes }),
      ...(marketId          !== undefined && { marketId }),
      ...(facebookUrl       !== undefined && { facebookUrl }),
      ...(assignedToId      !== undefined && { assignedToId }),
      ...(nextFollowUpAt    !== undefined && { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null }),
      ...(rating            !== undefined && { rating: parseInt(rating) }),
      ...(notes_to_add.length > 0 && { clientNotes: { create: notes_to_add } }),
      ...(notes_to_add.length > 0 && { lastFollowUpAt: new Date() }),
    },
    include: { createdBy: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } }, market: true, clientNotes: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  return NextResponse.json(client)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (payload.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
