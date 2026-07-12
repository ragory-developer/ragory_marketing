import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { UserCreateSchema, zodError } from '@/lib/schemas'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const result = UserCreateSchema.safeParse(body)
    if (!result.success) return zodError(result.error)

    const { name, username, password, role } = result.data

    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: role ?? 'EMPLOYEE',
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
