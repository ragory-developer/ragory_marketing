import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

type Params = { params: Promise<{ userId: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { error } = await getAuthPayload()
  if (error) return error
  const { userId } = await params

  const permissions = await prisma.permission.findMany({ where: { userId } })
  return NextResponse.json(permissions.map((p) => p.navKey))
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { payload, error } = await getAuthPayload()
  if (error) return error
  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { userId } = await params

  const { permissions } = await req.json()

  await prisma.permission.deleteMany({ where: { userId } })

  if (permissions?.length > 0) {
    await prisma.permission.createMany({
      data: permissions.map((key: string) => ({ userId, navKey: key, canAccess: true })),
    })
  }

  return NextResponse.json({ success: true })
}
