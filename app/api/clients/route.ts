import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { ClientCreateSchema, zodError } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const { searchParams } = req.nextUrl
  const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit    = Math.min(100, parseInt(searchParams.get('limit') || '25'))
  const skip     = (page - 1) * limit
  const q        = searchParams.get('q')          || ''
  const status   = searchParams.get('status')     || ''
  const priority = searchParams.get('priority')   || ''
  const district = searchParams.get('district')   || ''

  // ── Phase 6: Advanced filters ─────────────────────────────────────────────
  const assignedToId      = searchParams.get('assignedToId')      || ''
  const marketId          = searchParams.get('marketId')          || ''
  const dateFrom          = searchParams.get('dateFrom')          || ''
  const dateTo            = searchParams.get('dateTo')            || ''
  const hasEmergency      = searchParams.get('hasEmergency')      || ''   // 'true'
  const nextFollowUpBefore = searchParams.get('nextFollowUpBefore') || '' // ISO date string
  const sort              = searchParams.get('sort')              || ''   // 'name'|'lastFollowUpAt'|'createdAt'|'rating'
  const order             = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

  const where: Record<string, unknown> = {}

  if (q) {
    where.OR = [
      { name:     { contains: q, mode: 'insensitive' } },
      { phone:    { contains: q } },
      { shopName: { contains: q, mode: 'insensitive' } },
      { address:  { contains: q, mode: 'insensitive' } },
      { email:    { contains: q, mode: 'insensitive' } },
      { district: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (status)       where.status       = status
  if (priority)     where.priority     = priority
  if (district)     where.district     = { contains: district, mode: 'insensitive' }
  if (assignedToId) where.assignedToId = assignedToId
  if (marketId)     where.marketId     = marketId
  if (hasEmergency === 'true') where.activeEmergencyCount = { gt: 0 }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo   && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
    }
  }
  if (nextFollowUpBefore) {
    where.nextFollowUpAt = { lte: new Date(nextFollowUpBefore) }
  }

  // Build orderBy from sort param
  const VALID_SORT_FIELDS: Record<string, Record<string, string>> = {
    name:           { name: order },
    lastFollowUpAt: { lastFollowUpAt: order },
    createdAt:      { createdAt: order },
    rating:         { rating: order },
  }
  const orderBy: object[] = sort && VALID_SORT_FIELDS[sort]
    ? [VALID_SORT_FIELDS[sort]]
    : [{ activeEmergencyCount: 'desc' }, { createdAt: 'desc' }]

  const [clients, total, statusGroups] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        createdBy:      { select: { id: true, name: true } },
        assignedTo:     { select: { id: true, name: true } },
        market:         true,
        clientNotes:    { orderBy: { createdAt: 'desc' }, take: 1 },
        emergencyNotes: { where: { isDone: false } },
      },
    }),
    prisma.client.count({ where }),
    prisma.client.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const g of statusGroups) statusCounts[g.status] = g._count._all

  return NextResponse.json({ clients, total, page, limit, pages: Math.ceil(total / limit), statusCounts })
}

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  // ── Zod validation ──────────────────────────────────────────────────────────
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = ClientCreateSchema.safeParse(body)
  if (!result.success) return zodError(result.error)

  const {
    name, phone, shopName, address, alternativePhone, email,
    businessType, district, area, status, priority, source,
    notes, assignedToId, marketId, facebookUrl, nextFollowUpAt,
  } = result.data

  try {
    const client = await prisma.client.create({
      data: {
        name,
        phone,
        shopName:         shopName         || null,
        address:          address          || null,
        alternativePhone: alternativePhone || null,
        email:            email            || null,
        businessType:     businessType     || null,
        district:         district         || null,
        area:             area             || null,
        status:           status           ?? 'PROSPECT',
        priority:         priority         ?? 'MEDIUM',
        source:           source           || null,
        notes:            notes            || null,
        marketId:         (marketId && marketId.trim() !== '') ? marketId : null,
        facebookUrl:      facebookUrl      || null,
        nextFollowUpAt:   nextFollowUpAt   ?? null,
        createdById:      payload.userId as string,
        assignedToId:     (assignedToId && assignedToId.trim() !== '') ? assignedToId : null,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        market: true,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (err: unknown) {
    console.error('[Clients POST]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
