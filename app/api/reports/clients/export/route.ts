import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/reports/clients/export
 * Streams a CSV file of clients matching the provided filters.
 *
 * Query params mirror /api/clients:
 *   q, status, priority, district, dateFrom, dateTo, assignedToId, marketId
 */
export async function GET(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  const { searchParams } = req.nextUrl
  const q            = searchParams.get('q')          || ''
  const status       = searchParams.get('status')     || ''
  const priority     = searchParams.get('priority')   || ''
  const district     = searchParams.get('district')   || ''
  const dateFrom     = searchParams.get('dateFrom')   || ''
  const dateTo       = searchParams.get('dateTo')     || ''
  const assignedToId = searchParams.get('assignedToId') || ''
  const marketId     = searchParams.get('marketId')   || ''

  const where: Record<string, unknown> = {}
  if (q)        where.OR = [
    { name:     { contains: q, mode: 'insensitive' } },
    { phone:    { contains: q } },
    { shopName: { contains: q, mode: 'insensitive' } },
  ]
  if (status)       where.status       = status
  if (priority)     where.priority     = priority
  if (district)     where.district     = { contains: district, mode: 'insensitive' }
  if (assignedToId) where.assignedToId = assignedToId
  if (marketId)     where.marketId     = marketId
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) (where.createdAt as any).gte = new Date(dateFrom)
    if (dateTo)   (where.createdAt as any).lte = new Date(dateTo)
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      name: true, shopName: true, phone: true, alternativePhone: true,
      email: true, businessType: true, district: true, area: true,
      status: true, priority: true, source: true, rating: true,
      facebookUrl: true, notes: true,
      market:    { select: { name: true } },
      createdBy: { select: { name: true } },
      assignedTo:{ select: { name: true } },
      lastFollowUpAt: true, nextFollowUpAt: true, convertedAt: true, createdAt: true,
    },
  })

  // CSV header
  const headers = [
    'Name', 'Shop Name', 'Phone', 'Alt Phone', 'Email', 'Business Type',
    'District', 'Area', 'Market', 'Status', 'Priority', 'Rating',
    'Source', 'Created By', 'Assigned To', 'Facebook',
    'Last Follow-up', 'Next Follow-up', 'Converted At', 'Created At', 'Notes',
  ]

  const escape = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const rows = clients.map(c => [
    c.name, c.shopName ?? '', c.phone, c.alternativePhone ?? '', c.email ?? '',
    c.businessType ?? '', c.district ?? '', c.area ?? '', c.market?.name ?? '',
    c.status, c.priority, c.rating,
    c.source ?? '', c.createdBy?.name ?? '', c.assignedTo?.name ?? '',
    c.facebookUrl ?? '',
    c.lastFollowUpAt ? c.lastFollowUpAt.toISOString().slice(0,10) : '',
    c.nextFollowUpAt ? c.nextFollowUpAt.toISOString().slice(0,10) : '',
    c.convertedAt   ? c.convertedAt.toISOString().slice(0,10)    : '',
    c.createdAt.toISOString().slice(0,10),
    c.notes ?? '',
  ].map(escape).join(','))

  const csv = [headers.map(escape).join(','), ...rows].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clients_${new Date().toISOString().slice(0,10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
