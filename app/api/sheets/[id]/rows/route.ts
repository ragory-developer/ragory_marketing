import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const sheet = await prisma.googleSheet.update({
      where: { id: params.id },
      data: { rowCount: { increment: 1 } }
    })
    return NextResponse.json({ rowCount: sheet.rowCount })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add row' }, { status: 500 })
  }
}
