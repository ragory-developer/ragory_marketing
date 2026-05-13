import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  const { id } = await params

  const { name, isActive, password } = await req.json()

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (isActive !== undefined) updateData.isActive = isActive
  if (password) {
    const bcrypt = await import('bcryptjs')
    updateData.password = await bcrypt.hash(password, 10)
  }

  const user = await prisma.user.update({ where: { id }, data: updateData })
  return NextResponse.json({ success: true, user })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
