import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params
  const sheet = await prisma.googleSheet.findUnique({
    where: { id },
    include: {
      cells:   true,
      creator: { select: { name: true } },
      updater: { select: { name: true } },
    },
  })
  if (!sheet || sheet.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sheet)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  await prisma.googleSheet.update({
    where: { id },
    data: { isDeleted: true, deletedBy: payload.userId as string },
  })
  return NextResponse.json({ success: true })
}
