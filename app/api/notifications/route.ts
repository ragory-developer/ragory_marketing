import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/notifications
 * Returns the current user's notifications (latest 30, unread first).
 * Query: ?unreadOnly=true
 */
export async function GET(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true'
  const where: Record<string, unknown> = { userId: payload.userId }
  if (unreadOnly) where.isRead = false

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 30,
    }),
    prisma.notification.count({ where: { userId: payload.userId as string, isRead: false } }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read.
 * Body: { id?: string } — if omitted, marks ALL as read.
 */
export async function PATCH(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  let body: any = {}
  try { body = await req.json() } catch { /* OK */ }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: payload.userId as string },
      data:  { isRead: true },
    })
  } else {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId: payload.userId as string, isRead: false },
      data:  { isRead: true },
    })
  }

  return NextResponse.json({ success: true })
}
