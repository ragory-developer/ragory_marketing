import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NoteType } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const client = await prisma.client.findUnique({
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
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const body = await req.json()
  const {
    name, phone, shopName, address, alternativePhone, email,
    businessType, district, area, status, priority, source,
    notes, assignedToId, nextFollowUpAt, rating, marketId, facebookUrl,
  } = body

  const current = await prisma.client.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const auditNotes = []
  if (status && status !== current.status) {
    auditNotes.push({
      content: `Status changed from ${current.status} to ${status}`,
      type: NoteType.GENERAL,
      author: { connect: { id: payload.userId as string } },
    })
  }
  if (priority && priority !== current.priority) {
    auditNotes.push({
      content: `Priority changed from ${current.priority} to ${priority}`,
      type: NoteType.GENERAL,
      author: { connect: { id: payload.userId as string } },
    })
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(name             !== undefined && { name }),
      ...(phone            !== undefined && { phone }),
      ...(shopName         !== undefined && { shopName }),
      ...(address          !== undefined && { address }),
      ...(alternativePhone !== undefined && { alternativePhone }),
      ...(email            !== undefined && { email }),
      ...(businessType     !== undefined && { businessType }),
      ...(district         !== undefined && { district }),
      ...(area             !== undefined && { area }),
      ...(status           !== undefined && { status }),
      ...(priority         !== undefined && { priority }),
      ...(source           !== undefined && { source }),
      ...(notes            !== undefined && { notes }),
      ...(marketId         !== undefined && { marketId }),
      ...(facebookUrl      !== undefined && { facebookUrl }),
      ...(assignedToId     !== undefined && { assignedToId }),
      ...(nextFollowUpAt   !== undefined && { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null }),
      ...(rating           !== undefined && { rating: parseInt(rating) }),
      ...(auditNotes.length > 0 && { clientNotes: { create: auditNotes }, lastFollowUpAt: new Date() }),
    },
    include: {
      createdBy:  { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      market:     true,
      clientNotes: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  return NextResponse.json(client)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
