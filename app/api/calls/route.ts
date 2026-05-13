import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const q = searchParams.get('q') || ''
  const clientId = searchParams.get('clientId')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  
  const skip = (page - 1) * limit

  const where: any = {}
  if (clientId) where.clientId = clientId
  if (q) {
    where.OR = [
      { client: { name: { contains: q, mode: 'insensitive' } } },
      { client: { shopName: { contains: q, mode: 'insensitive' } } },
      { phoneNumber: { contains: q } },
      { note: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        client: { 
          select: { 
            id: true, 
            name: true, 
            shopName: true,
            _count: { select: { callLogs: true } }
          } 
        },
        author: { select: { name: true } }
      },
      orderBy: { [sortBy]: sortOrder }
    }),
    prisma.callLog.count({ where })
  ])

  return NextResponse.json({
    calls,
    total,
    pages: Math.ceil(total / limit)
  })
}

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const body = await req.json()
  const { clientId, phoneNumber, duration, note } = body

  if (!clientId || !phoneNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const callLog = await prisma.callLog.create({
    data: {
      clientId,
      authorId: payload.userId as string,
      phoneNumber,
      duration: parseInt(duration || '0'),
      note
    }
  })

  // Create a corresponding activity history entry
  const minutes = Math.floor(parseInt(duration || '0') / 60)
  const seconds = parseInt(duration || '0') % 60
  const durationText = `${minutes}m ${seconds}s`
  const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  
  await prisma.clientNote.create({
    data: {
      clientId,
      authorId: payload.userId as string,
      type: 'CALL',
      content: `[Voice Call @ ${timestamp}] Duration: ${durationText} | Session Note: ${note || 'No summary recorded'}`
    }
  })

  await prisma.client.update({
    where: { id: clientId },
    data: { lastFollowUpAt: new Date() }
  })

  return NextResponse.json(callLog)
}
