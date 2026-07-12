import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

/** GET /api/campaigns/[id]/leads — list clients in a campaign */
export async function GET(_: NextRequest, { params }: Params) {
  const { error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const leads = await prisma.campaignLead.findMany({
    where: { campaignId: id },
    include: {
      client: {
        select: {
          id: true, name: true, shopName: true, phone: true,
          status: true, priority: true, district: true,
          market: true, assignedTo: { select: { name: true } },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  return NextResponse.json(leads)
}

/** POST /api/campaigns/[id]/leads — add client(s) to a campaign */
export async function POST(req: NextRequest, { params }: Params) {
  const { error } = await getAuthPayload()
  if (error) return error
  const { id: campaignId } = await params

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Accept either a single clientId or an array
  const clientIds: string[] = Array.isArray(body.clientIds)
    ? body.clientIds
    : body.clientId ? [body.clientId] : []

  if (clientIds.length === 0) {
    return NextResponse.json({ error: 'clientId or clientIds required' }, { status: 400 })
  }

  const source = body.source || 'manual'

  try {
    // createMany skips duplicates via skipDuplicates
    const result = await prisma.campaignLead.createMany({
      data: clientIds.map(clientId => ({ campaignId, clientId, source })),
      skipDuplicates: true,
    })
    return NextResponse.json({ added: result.count }, { status: 201 })
  } catch (err) {
    console.error('[CampaignLeads POST]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

/** DELETE /api/campaigns/[id]/leads?clientId=xxx — remove a client from a campaign */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await getAuthPayload()
  if (error) return error
  const { id: campaignId } = await params

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  await prisma.campaignLead.deleteMany({ where: { campaignId, clientId } })
  return NextResponse.json({ success: true })
}
