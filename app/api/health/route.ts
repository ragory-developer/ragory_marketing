import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Basic DB check
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'healthy', database: 'connected' })
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: 'Database connection failed' }, { status: 500 })
  }
}
