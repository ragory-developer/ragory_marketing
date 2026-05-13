import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// PATCH — upsert a single cell (value + formatting)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = (await cookies()).get('auth_token')?.value
    const decoded = token ? await verifyToken(token) : null
    const userId = decoded?.userId as string
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { row, col, value, bold, italic, fillColor, textColor, align, wrap, format } = body

    if (row === undefined || col === undefined) {
      return NextResponse.json({ error: 'row and col are required' }, { status: 400 })
    }

    const cell = await prisma.sheetCell.upsert({
      where: { sheetId_row_col: { sheetId: params.id, row, col } },
      update: {
        ...(value !== undefined && { value }),
        ...(bold !== undefined && { bold }),
        ...(italic !== undefined && { italic }),
        ...(fillColor !== undefined && { fillColor }),
        ...(textColor !== undefined && { textColor }),
        ...(align !== undefined && { align }),
        ...(wrap !== undefined && { wrap }),
        ...(format !== undefined && { format }),
      },
      create: {
        sheetId: params.id,
        row,
        col,
        value: value ?? '',
        bold: bold ?? false,
        italic: italic ?? false,
        fillColor: fillColor ?? null,
        textColor: textColor ?? null,
        align: align ?? 'left',
        wrap: wrap ?? false,
        format: format ?? 'text',
      }
    })

    // Track last editor
    await prisma.googleSheet.update({ where: { id: params.id }, data: { updatedBy: userId } })

    return NextResponse.json(cell)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
