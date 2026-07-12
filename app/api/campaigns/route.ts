import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { CampaignCreateSchema, zodError } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') || ''
  const type   = searchParams.get('type')   || ''
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit  = Math.min(50, parseInt(searchParams.get('limit') || '20'))

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (type)   where.type   = type

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { leads: true, tasks: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ])

  return NextResponse.json({ campaigns, total, page, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = CampaignCreateSchema.safeParse(body)
  if (!result.success) return zodError(result.error)

  const { title, type, description, startDate, endDate, budget, targetCount } = result.data

  try {
    const campaign = await prisma.campaign.create({
      data: {
        title,
        type,
        description:  description  ?? null,
        startDate:    startDate    ?? null,
        endDate:      endDate      ?? null,
        budget:       budget       ?? null,
        targetCount:  targetCount  ?? null,
        createdById: payload.userId as string,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { leads: true, tasks: true } },
      },
    })
    return NextResponse.json(campaign, { status: 201 })
  } catch (err) {
    console.error('[Campaigns POST]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
