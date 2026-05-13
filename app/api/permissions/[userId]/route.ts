import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const permissions = await prisma.permission.findMany({
      where: { userId }
    })
    return NextResponse.json(permissions.map(p => p.navKey))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const { permissions } = await req.json() // Array of navKeys e.g. ['dashboard', 'employees']

    // Clear existing
    await prisma.permission.deleteMany({
      where: { userId }
    })

    // Insert new
    if (permissions && permissions.length > 0) {
      await prisma.permission.createMany({
        data: permissions.map((key: string) => ({
          userId,
          navKey: key,
          canAccess: true
        }))
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 })
  }
}
