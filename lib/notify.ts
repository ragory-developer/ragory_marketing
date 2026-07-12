/**
 * lib/notify.ts
 * Helper to create in-app notifications for users.
 *
 * Usage:
 *   import { notify } from '@/lib/notify'
 *   await notify({ userId: 'xxx', title: 'Task assigned', body: 'You have a new task...', link: '/tasks' })
 */

import prisma from './prisma'

interface NotifyInput {
  userId: string
  title:  string
  body:   string
  link?:  string
}

/** Create a single notification for one user */
export async function notify(input: NotifyInput) {
  try {
    return await prisma.notification.create({ data: input })
  } catch (err) {
    console.error('[notify]', err)
    return null
  }
}

/** Create the same notification for multiple users */
export async function notifyMany(userIds: string[], title: string, body: string, link?: string) {
  if (userIds.length === 0) return
  try {
    await prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, title, body, link: link ?? null })),
    })
  } catch (err) {
    console.error('[notifyMany]', err)
  }
}

/** Get all SUPER_ADMIN and MARKETING_DIRECTOR user IDs for broadcasting */
export async function getManagerIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'MARKETING_DIRECTOR', 'MARKETING_MANAGER'] }, isActive: true },
    select: { id: true },
  })
  return users.map(u => u.id)
}
