import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, colIndex: string }> }) {
  const { id, colIndex } = await params;
  try {
    const cIdx = parseInt(colIndex)
    const sheet = await prisma.googleSheet.findUnique({ where: { id } })
    if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

    // Delete cells in this col
    await prisma.sheetCell.deleteMany({
      where: { sheetId: id, col: cIdx }
    })

    // Shift cols to the right
    await prisma.$executeRaw`
      UPDATE sheet_cells 
      SET col = col - 1 
      WHERE sheet_id = ${id}::uuid AND col > ${cIdx} AND row >= 0
    `

    // Update colCount
    const updated = await prisma.googleSheet.update({
      where: { id: id },
      data: { colCount: Math.max(1, sheet.colCount - 1) }
    })

    return NextResponse.json({ colCount: updated.colCount })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete col' }, { status: 500 })
  }
}
