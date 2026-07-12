import { NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * Returns 30 days of daily activity data for sparkline/line charts.
 * Each data point: { date: "2026-06-01", clients: N, notes: N, calls: N }
 */
export async function GET() {
  const { error } = await getAuthPayload()
  if (error) return error

  const days = 30
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const [clients, notes, calls] = await Promise.all([
    prisma.client.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.clientNote.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.callLog.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ])

  // Build a map of date string → counts
  const map: Record<string, { clients: number; notes: number; calls: number }> = {}

  // Initialise all 30 days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    map[key] = { clients: 0, notes: 0, calls: 0 }
  }

  for (const r of clients) {
    const k = r.createdAt.toISOString().slice(0, 10)
    if (map[k]) map[k].clients++
  }
  for (const r of notes) {
    const k = r.createdAt.toISOString().slice(0, 10)
    if (map[k]) map[k].notes++
  }
  for (const r of calls) {
    const k = r.createdAt.toISOString().slice(0, 10)
    if (map[k]) map[k].calls++
  }

  const trend = Object.entries(map).map(([date, v]) => ({
    date,
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ...v,
  }))

  return NextResponse.json(trend)
}
