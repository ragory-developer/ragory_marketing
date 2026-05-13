import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params
  const sheet = await prisma.googleSheet.update({
    where: { id },
    data: { colCount: { increment: 1 } },
  })
  return NextResponse.json({ colCount: sheet.colCount })
}
