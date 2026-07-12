import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NoteType } from '@prisma/client'
import { TaskCreateSchema, zodError } from '@/lib/schemas'
import { notify } from '@/lib/notify'

const taskInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
  client:     { select: { id: true, name: true, shopName: true } },
  campaign:   { select: { id: true, title: true } },
}

export async function GET(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const { searchParams } = req.nextUrl
  const status       = searchParams.get('status')     || ''
  const priority     = searchParams.get('priority')   || ''
  const assignedToId = searchParams.get('assignedTo') || ''
  const campaignId   = searchParams.get('campaign')   || ''
  const page         = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit        = Math.min(100, parseInt(searchParams.get('limit') || '50'))

  const where: any = {}

  // Non-admins see only their own tasks
  const role = (payload as any).role
  const isManager = ['SUPER_ADMIN','MARKETING_DIRECTOR','MARKETING_MANAGER','FIELD_MARKETING_MANAGER'].includes(role)
  if (!isManager) where.assignedToId = payload.userId

  if (status)       where.status       = status
  if (priority)     where.priority     = priority
  if (assignedToId) where.assignedToId = assignedToId
  if (campaignId)   where.campaignId   = campaignId

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: taskInclude,
    }),
    prisma.task.count({ where }),
  ])

  return NextResponse.json({ tasks, total, page, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = TaskCreateSchema.safeParse(body)
  if (!result.success) return zodError(result.error)

  const { title, description, priority, dueDate, assignedToId, clientId, campaignId } = result.data

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        priority:    priority   ?? 'MEDIUM',
        dueDate:     dueDate    ?? null,
        assignedToId: (assignedToId && assignedToId.trim() !== '') ? assignedToId : null,
        clientId:    (clientId   && clientId.trim()   !== '') ? clientId   : null,
        campaignId:  (campaignId && campaignId.trim() !== '') ? campaignId : null,
        createdById: payload.userId as string,
      },
      include: taskInclude,
    })

    // Phase 7: Notify assignee
    if (task.assignedToId && task.assignedToId !== payload.userId) {
      await notify({
        userId: task.assignedToId,
        title: 'New Task Assigned',
        body: `You have been assigned a new task: ${task.title}`,
        link: '/tasks'
      })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    console.error('[Tasks POST]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
