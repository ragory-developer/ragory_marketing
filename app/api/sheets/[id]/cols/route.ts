import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const sheet = await prisma.googleSheet.update({
    where: { id },
    data: { colCount: { increment: 1 } },
  })
  return NextResponse.json({ colCount: sheet.colCount })
}
