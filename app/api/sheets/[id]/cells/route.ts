import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const { row, col, value, bold, italic, fillColor, textColor, align, wrap, format } = body

  if (row === undefined || col === undefined) {
    return NextResponse.json({ error: 'row and col are required' }, { status: 400 })
  }

  const cell = await prisma.sheetCell.upsert({
    where: { sheetId_row_col: { sheetId: id, row, col } },
    update: {
      ...(value     !== undefined && { value }),
      ...(bold      !== undefined && { bold }),
      ...(italic    !== undefined && { italic }),
      ...(fillColor !== undefined && { fillColor }),
      ...(textColor !== undefined && { textColor }),
      ...(align     !== undefined && { align }),
      ...(wrap      !== undefined && { wrap }),
      ...(format    !== undefined && { format }),
    },
    create: {
      sheetId:   id,
      row,
      col,
      value:     value     ?? '',
      bold:      bold      ?? false,
      italic:    italic    ?? false,
      fillColor: fillColor ?? null,
      textColor: textColor ?? null,
      align:     align     ?? 'left',
      wrap:      wrap      ?? false,
      format:    format    ?? 'text',
    },
  })

  await prisma.googleSheet.update({ where: { id }, data: { updatedBy: payload.userId as string } })

  return NextResponse.json(cell)
}
