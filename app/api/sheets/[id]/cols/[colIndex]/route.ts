import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string; colIndex: string }> }

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id, colIndex: colIndexStr } = await params
  const cIdx = parseInt(colIndexStr)

  const sheet = await prisma.googleSheet.findUnique({ where: { id } })
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  await prisma.sheetCell.deleteMany({ where: { sheetId: id, col: cIdx } })

  await prisma.$executeRaw`
    UPDATE sheet_cells
    SET col = col - 1
    WHERE sheet_id = ${id}::uuid AND col > ${cIdx} AND row >= 0
  `

  const updated = await prisma.googleSheet.update({
    where: { id },
    data: { colCount: Math.max(1, sheet.colCount - 1) },
  })

  return NextResponse.json({ colCount: updated.colCount })
}
