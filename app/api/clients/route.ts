import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit  = Math.min(100, parseInt(searchParams.get('limit') || '25'))
  const skip   = (page - 1) * limit
  const q      = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''
  const district = searchParams.get('district') || ''

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { shopName: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (status)   where.status   = status
  if (priority) where.priority = priority
  if (district) where.district = { contains: district, mode: 'insensitive' }

  const [clients, total, statusGroups] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy:  { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        market:     true,
        clientNotes: { orderBy: { createdAt: 'desc' }, take: 1 },
        emergencyNotes: { where: { isDone: false } },
      },
    }),
    prisma.client.count({ where }),
    prisma.client.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const statusCounts: Record<string,number> = {}
  for (const g of statusGroups) statusCounts[g.status] = g._count._all

  return NextResponse.json({ clients, total, page, limit, pages: Math.ceil(total / limit), statusCounts })
}

export async function POST(req: NextRequest) {
  const token = (await cookies()).get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, shopName, address, alternativePhone, email, businessType, district, area, status, priority, source, notes, assignedToId, marketId, facebookUrl } = body

  if (!name || !phone) return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })

  try {
    const client = await prisma.client.create({
      data: {
        name, phone,
        shopName:        shopName        || null,
        address:         address         || null,
        alternativePhone:alternativePhone|| null,
        email:           email           || null,
        businessType:    businessType    || null,
        district:        district        || null,
        area:            area            || null,
        status:          status          || 'PROSPECT',
        priority:        priority        || 'MEDIUM',
        source:          source          || null,
        notes:           notes           || null,
        marketId:        marketId        || null,
        facebookUrl:     facebookUrl     || null,
        createdById:     (payload as any).userId,
        assignedToId:    assignedToId    || null,
        // Create initial note if provided
        ...(notes && {
          clientNotes: {
            create: {
              content: notes,
              type: 'GENERAL',
              authorId: (payload as any).userId
            }
          }
        })
      },
      include: { createdBy: { select: { id: true, name: true } }, market: true },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (err: any) {
    console.error('Prisma Create Error:', err)
    return NextResponse.json({ error: 'Database error: ' + err.message }, { status: 500 })
  }
}
