import { NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const permissions = await prisma.permission.findMany({
    where: { userId: payload.userId as string },
  })

  return NextResponse.json({
    user: payload,
    permissions: permissions.map((p) => p.navKey),
  })
}
