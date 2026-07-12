import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NoteType } from '@prisma/client'
import { TaskUpdateSchema, zodError } from '@/lib/schemas'
import { notify } from '@/lib/notify'

type Params = { params: Promise<{ id: string }> }

const taskInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
  client:     { select: { id: true, name: true, shopName: true } },
  campaign:   { select: { id: true, title: true } },
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only assignee, creator, or managers can update
  const role = (payload as any).role
  const isManager = ['SUPER_ADMIN','MARKETING_DIRECTOR','MARKETING_MANAGER','FIELD_MARKETING_MANAGER'].includes(role)
  const isInvolved = existing.assignedToId === payload.userId || existing.createdById === payload.userId
  if (!isManager && !isInvolved) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = TaskUpdateSchema.safeParse(body)
  if (!result.success) return zodError(result.error)

  const { title, description, status, priority, dueDate, assignedToId, clientId, campaignId } = result.data

  // Compute completedAt when transitioning to COMPLETED
  const isCompleting = status === 'COMPLETED' && existing.status !== 'COMPLETED'
  const completedAt  = isCompleting ? new Date() : existing.completedAt

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title        !== undefined && { title }),
      ...(description  !== undefined && { description }),
      ...(status       !== undefined && { status }),
      ...(priority     !== undefined && { priority }),
      ...(dueDate      !== undefined && { dueDate }),
      ...(assignedToId !== undefined && { assignedToId: (assignedToId && assignedToId.trim() !== '') ? assignedToId : null }),
      ...(clientId     !== undefined && { clientId: (clientId && clientId.trim() !== '') ? clientId : null }),
      ...(campaignId   !== undefined && { campaignId: (campaignId && campaignId.trim() !== '') ? campaignId : null }),
      ...(isCompleting && { completedAt }),
    },
    include: taskInclude,
  })

  // If a client is linked and task just completed → auto-create a ClientNote
  if (isCompleting && task.client?.id) {
    await prisma.clientNote.create({
      data: {
        clientId: task.client.id,
        authorId: payload.userId as string,
        content:  `✅ [Task Completed] "${task.title}"`,
        type:     NoteType.FOLLOW_UP,
      },
    }).catch(() => { /* non-critical */ })
  }

  // Phase 7: Notify on reassignment
  if (assignedToId && assignedToId !== existing.assignedToId && assignedToId !== payload.userId) {
    await notify({
      userId: assignedToId,
      title: 'Task Reassigned',
      body: `A task has been reassigned to you: ${task.title}`,
      link: '/tasks'
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = (payload as any).role
  const isManager = ['SUPER_ADMIN','MARKETING_DIRECTOR','MARKETING_MANAGER','FIELD_MARKETING_MANAGER'].includes(role)
  const isCreator = existing.createdById === payload.userId

  if (!isManager && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
