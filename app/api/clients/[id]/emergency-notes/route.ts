import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getManagerIds, notifyMany } from '@/lib/notify'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const notes = await prisma.emergencyNote.findMany({
    where: { clientId: id },
    include: {
      author: { select: { id: true, name: true } },
      doneBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const permissions = await prisma.permission.findMany({ where: { userId: payload.userId as string } })
  const canAdd = payload.role === 'SUPER_ADMIN' || permissions.some((p) => p.navKey === 'emergency_notes')
  if (!canAdd) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content, priority } = await req.json()
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const [note] = await prisma.$transaction([
    prisma.emergencyNote.create({
      data: {
        clientId: id,
        content,
        priority: priority || 'MEDIUM',
        authorId: payload.userId as string,
      },
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.client.update({
      where: { id },
      data: { activeEmergencyCount: { increment: 1 } }
    }),
    prisma.clientNote.create({
      data: {
        clientId: id,
        authorId: payload.userId as string,
        content: `📌 [Reminder Created] Priority: ${priority || 'MEDIUM'}. Content: "${content}"`,
        type: 'GENERAL',
      }
    })
  ])

  // Phase 7: Notify managers about the new emergency/reminder
  const managers = await getManagerIds()
  const otherManagers = managers.filter(m => m !== payload.userId)
  const client = await prisma.client.findUnique({ where: { id }, select: { name: true } })
  if (client) {
    await notifyMany(
      otherManagers,
      `🚨 New Emergency on ${client.name}`,
      `${payload.username || 'Someone'} created a ${priority || 'MEDIUM'} priority emergency note: "${content}"`,
      `/clients/${id}`
    )
  }

  return NextResponse.json(note)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const noteId = searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'Note ID required' }, { status: 400 })

  const note = await prisma.emergencyNote.findUnique({ where: { id: noteId } })
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (payload.role !== 'SUPER_ADMIN' && note.authorId !== payload.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.emergencyNote.delete({ where: { id: noteId } })
    if (!note.isDone) {
      await tx.client.update({
        where: { id: note.clientId },
        data: { activeEmergencyCount: { decrement: 1 } }
      })
    }
    await tx.clientNote.create({
      data: {
        clientId: note.clientId,
        authorId: payload.userId as string,
        content: `🗑️ [Reminder Deleted] Content: "${note.content}"`,
        type: 'GENERAL',
      }
    })
  })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const { noteId, isDone } = await req.json()
  if (!noteId) return NextResponse.json({ error: 'Note ID required' }, { status: 400 })

  const note = await prisma.emergencyNote.findUnique({ where: { id: noteId } })
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (note.isDone && !isDone) {
    const permissions = await prisma.permission.findMany({ where: { userId: payload.userId as string } })
    const canUncheck = payload.role === 'SUPER_ADMIN' || permissions.some((p) => p.navKey === 'emergency_notes')
    if (!canUncheck) return NextResponse.json({ error: 'Only admins can uncheck completed tasks' }, { status: 403 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const isChanging = note.isDone !== isDone;
    
    const u = await tx.emergencyNote.update({
      where: { id: noteId },
      data: {
        isDone,
        doneById: isDone ? payload.userId as string : null,
      },
      include: {
        author: { select: { id: true, name: true } },
        doneBy: { select: { id: true, name: true } },
      },
    })

    if (isChanging) {
      await tx.client.update({
        where: { id: note.clientId },
        data: { activeEmergencyCount: { [isDone ? 'decrement' : 'increment']: 1 } }
      })

      // Get operator details
      const user = await tx.user.findUnique({ where: { id: payload.userId as string } })
      const operatorName = user?.name || payload.username || 'System'

      // Log resolved/reopened event in ClientNote
      await tx.clientNote.create({
        data: {
          clientId: note.clientId,
          authorId: payload.userId as string,
          content: isDone
            ? `✅ [Reminder Resolved] Content: "${note.content}" (resolved by ${operatorName})`
            : `🔄 [Reminder Reopened] Content: "${note.content}" (reopened by ${operatorName})`,
          type: 'GENERAL',
        }
      })
    }

    return u;
  })
  return NextResponse.json(updated)
}
