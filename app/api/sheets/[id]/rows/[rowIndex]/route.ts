import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(req: Request, { params }: { params: { id: string, rowIndex: string } }) {
  try {
    const rowIndex = parseInt(params.rowIndex)
    const sheet = await prisma.googleSheet.findUnique({ where: { id: params.id } })
    if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

    // Delete cells in this row
    await prisma.sheetCell.deleteMany({
      where: { sheetId: params.id, row: rowIndex }
    })

    // Shift rows below
    await prisma.$executeRaw`
      UPDATE sheet_cells 
      SET row = row - 1 
      WHERE sheet_id = ${params.id}::uuid AND row > ${rowIndex}
    `

    // Update rowCount
    const updated = await prisma.googleSheet.update({
      where: { id: params.id },
      data: { rowCount: Math.max(1, sheet.rowCount - 1) }
    })

    return NextResponse.json({ rowCount: updated.rowCount })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete row' }, { status: 500 })
  }
}
