import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

async function getUserId() {
  const token = cookies().get('auth_token')?.value
  const decoded = token ? await verifyToken(token) : null
  return decoded?.userId as string | null
}

// GET single sheet with all cells
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const sheet = await prisma.googleSheet.findUnique({
      where: { id: params.id },
      include: {
        cells: true,
        creator: { select: { name: true } },
        updater: { select: { name: true } }
      }
    })
    if (!sheet || sheet.isDeleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(sheet)
  } catch (error) {
    console.error('GET Sheet Error:', error)
    return NextResponse.json({ error: 'Failed to load sheet' }, { status: 500 })
  }
}

// POST append row data (legacy, disabled for now)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { values } = await req.json()
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sheetRecord = await prisma.googleSheet.findUnique({ where: { id: params.id } })
    if (!sheetRecord) return NextResponse.json({ error: 'Not found in DB' }, { status: 404 })

    await prisma.googleSheet.update({ where: { id: params.id }, data: { updatedBy: userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

// DELETE soft-delete sheet
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await prisma.googleSheet.update({
      where: { id: params.id },
      data: { isDeleted: true, deletedBy: userId }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
