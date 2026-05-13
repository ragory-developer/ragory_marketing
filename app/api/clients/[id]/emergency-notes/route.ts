import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

  const note = await prisma.emergencyNote.create({
    data: {
      clientId: id,
      content,
      priority: priority || 'MEDIUM',
      authorId: payload.userId as string,
    },
    include: { author: { select: { id: true, name: true } } },
  })
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

  await prisma.emergencyNote.delete({ where: { id: noteId } })
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

  const updated = await prisma.emergencyNote.update({
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
  return NextResponse.json(updated)
}
