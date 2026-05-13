import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string; rowIndex: string }> }

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id, rowIndex: rowIndexStr } = await params
  const rIdx = parseInt(rowIndexStr)

  const sheet = await prisma.googleSheet.findUnique({ where: { id } })
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  await prisma.sheetCell.deleteMany({ where: { sheetId: id, row: rIdx } })

  await prisma.$executeRaw`
    UPDATE sheet_cells
    SET row = row - 1
    WHERE sheet_id = ${id}::uuid AND row > ${rIdx}
  `

  const updated = await prisma.googleSheet.update({
    where: { id },
    data: { rowCount: Math.max(1, sheet.rowCount - 1) },
  })

  return NextResponse.json({ rowCount: updated.rowCount })
}
