import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const { content, type } = await req.json()
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const note = await prisma.clientNote.create({
    data: {
      clientId: id,
      authorId: payload.userId as string,
      content,
      type: type || 'GENERAL',
    },
    include: { author: { select: { id: true, name: true } } },
  })

  await prisma.client.update({
    where: { id },
    data: { lastFollowUpAt: new Date() },
  })

  return NextResponse.json(note, { status: 201 })
}
