import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const sheets = await prisma.googleSheet.findMany({
    where: { isDeleted: false },
    include: {
      creator: { select: { name: true } },
      updater: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(sheets)
}

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const spreadsheetId = `mock-id-${Date.now()}`

  const newSheet = await prisma.googleSheet.create({
    data: {
      name,
      spreadsheetId,
      creator: { connect: { id: payload.userId as string } },
    },
  })

  return NextResponse.json(newSheet)
}
