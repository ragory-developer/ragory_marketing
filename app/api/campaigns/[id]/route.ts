import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      leads: {
        include: { client: { select: { id: true, name: true, shopName: true, phone: true, status: true, priority: true } } },
        orderBy: { addedAt: 'desc' },
      },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy:  { select: { id: true, name: true } },
          client:     { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, type, status, description, startDate, endDate, budget, spent, targetCount } = body

  try {
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(title       !== undefined && { title: title.trim() }),
        ...(type        !== undefined && { type }),
        ...(status      !== undefined && { status }),
        ...(description !== undefined && { description }),
        ...(startDate   !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate     !== undefined && { endDate:   endDate   ? new Date(endDate)   : null }),
        ...(budget      !== undefined && { budget:    budget    ? parseFloat(budget)   : null }),
        ...(spent       !== undefined && { spent:     parseFloat(spent) }),
        ...(targetCount !== undefined && { targetCount: targetCount ? parseInt(targetCount) : null }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { leads: true, tasks: true } },
      },
    })
    return NextResponse.json(campaign)
  } catch (err) {
    console.error('[Campaign PATCH]', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  if ((payload as any).role !== 'SUPER_ADMIN' && (payload as any).role !== 'MARKETING_DIRECTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
