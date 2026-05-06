import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, type } = await req.json()
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const note = await prisma.clientNote.create({
    data: {
      clientId: params.id,
      authorId: payload.userId,
      content,
      type: type || 'GENERAL',
    },
    include: { author: { select: { id: true, name: true } } },
  })

  // Update last follow-up date on the client
  await prisma.client.update({
    where: { id: params.id },
    data: { lastFollowUpAt: new Date() },
  })

  return NextResponse.json(note, { status: 201 })
}
