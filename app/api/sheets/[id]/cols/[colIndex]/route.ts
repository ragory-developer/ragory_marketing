import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(req: Request, { params }: { params: { id: string, colIndex: string } }) {
  try {
    const colIndex = parseInt(params.colIndex)
    const sheet = await prisma.googleSheet.findUnique({ where: { id: params.id } })
    if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

    // Delete cells in this col
    await prisma.sheetCell.deleteMany({
      where: { sheetId: params.id, col: colIndex }
    })

    // Shift cols to the right
    await prisma.$executeRaw`
      UPDATE sheet_cells 
      SET col = col - 1 
      WHERE sheet_id = ${params.id}::uuid AND col > ${colIndex} AND row >= 0
    `

    // Update colCount
    const updated = await prisma.googleSheet.update({
      where: { id: params.id },
      data: { colCount: Math.max(1, sheet.colCount - 1) }
    })

    return NextResponse.json({ colCount: updated.colCount })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete col' }, { status: 500 })
  }
}
