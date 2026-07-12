import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  try {
    const { platform, to, name, email, phone, assignedToId, marketId } = await req.json()

    if (!platform || !to || !name) {
      return NextResponse.json({ error: 'Platform, recipient handle (to), and Lead Name are required' }, { status: 400 })
    }

    // 1. Create a client with the provided form data
    const newClient = await prisma.client.create({
      data: {
        name,
        email: email || `${to.replace(/[^a-zA-Z0-9]/g, '')}@social-lead.com`,
        phone: phone || (platform === 'WHATSAPP' ? to : ''),
        status: 'PROSPECT',
        source: platform,
        createdById: payload.userId,
        assignedToId: assignedToId || payload.userId,
        marketId: marketId || null
      }
    })

    // 2. Link all social messages in this thread (same platform and sender/recipient handle) to the new client
    await prisma.socialMessage.updateMany({
      where: {
        platform,
        to
      },
      data: {
        clientId: newClient.id,
        isLeadCaptured: true
      }
    })

    // 3. Create a Note on the newly created client
    const conversationHistory = await prisma.socialMessage.findMany({
      where: { platform, to, direction: 'INBOUND' },
      orderBy: { createdAt: 'asc' },
      take: 1
    })

    const initialMsg = conversationHistory[0]?.content || 'Initial contact'

    await prisma.clientNote.create({
      data: {
        clientId: newClient.id,
        authorId: payload.userId,
        type: 'GENERAL',
        content: `Lead converted from ${platform} conversation. Initial inquiry: "${initialMsg}"`
      }
    })

    return NextResponse.json({ success: true, client: newClient }, { status: 201 })
  } catch (err) {
    console.error('[Social Convert Lead]', err)
    return NextResponse.json({ error: 'Failed to convert conversation to CRM lead' }, { status: 500 })
  }
}
