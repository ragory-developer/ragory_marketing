import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  try {
    const { to, content } = await req.json()

    if (!to || !content) {
      return NextResponse.json({ error: 'Phone number and message content required' }, { status: 400 })
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))

    const message = await prisma.socialMessage.create({
      data: {
        platform: 'WHATSAPP',
        to,
        content,
        status: 'SENT'
      }
    })

    return NextResponse.json({ success: true, message }, { status: 201 })
  } catch (err) {
    console.error('[Social WhatsApp]', err)
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  try {
    const messages = await prisma.socialMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return NextResponse.json({ messages })
  } catch (err) {
    console.error('[Social Msg Get]', err)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
