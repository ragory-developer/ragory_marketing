import { NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const { error } = await getAuthPayload()
  if (error) return error

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek  = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const [
    totalClients,
    newThisMonth,
    converted,
    activeEmergencies,
    statusGroups,
    callsThisWeek,
    activeCampaigns,
    pendingTasks,
    topMarkets,
    recentClients,
  ] = await Promise.all([
    // Total clients
    prisma.client.count(),

    // New this month
    prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),

    // Converted (status = CLIENTS)
    prisma.client.count({ where: { status: 'CLIENTS' } }),

    // Active emergencies
    prisma.emergencyNote.count({ where: { isDone: false } }),

    // Breakdown by status
    prisma.client.groupBy({ by: ['status'], _count: { _all: true } }),

    // Calls this week
    prisma.callLog.count({ where: { createdAt: { gte: startOfWeek } } }),

    // Active campaigns
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),

    // Pending tasks
    prisma.task.count({ where: { status: 'PENDING' } }),

    // Top 5 markets by client count
    prisma.market.findMany({
      take: 5,
      include: { _count: { select: { clients: true } } },
      orderBy: { clients: { _count: 'desc' } },
    }),

    // 5 most recently added clients
    prisma.client.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, shopName: true, status: true,
        priority: true, createdAt: true,
        createdBy: { select: { name: true } },
      },
    }),
  ])

  const totalCount = totalClients || 1 // avoid /0
  const conversionRate = Math.round((converted / totalCount) * 100 * 10) / 10

  const statusBreakdown: Record<string, number> = {}
  for (const g of statusGroups) statusBreakdown[g.status] = g._count._all

  return NextResponse.json({
    totalClients,
    newThisMonth,
    converted,
    conversionRate,
    activeEmergencies,
    callsThisWeek,
    activeCampaigns,
    pendingTasks,
    statusBreakdown,
    topMarkets: topMarkets.map(m => ({ name: m.name, count: m._count.clients })),
    recentClients,
  })
}
