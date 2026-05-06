import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const sheet = await prisma.googleSheet.update({
      where: { id: params.id },
      data: { colCount: { increment: 1 } }
    })
    return NextResponse.json({ colCount: sheet.colCount })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add column' }, { status: 500 })
  }
}
