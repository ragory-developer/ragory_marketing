import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  try {
    // 1. Check if mock messages exist. If not, populate detailed conversations to simulate a real inbox.
    const messageCount = await prisma.socialMessage.count()
    if (messageCount === 0) {
      // Let's create an active converted prospect
      const prospectClient = await prisma.client.create({
        data: {
          name: 'Sarah Connor',
          phone: '+14155552671',
          email: 'sconnor@cyberdyne.com',
          status: 'PROSPECT',
          source: 'WHATSAPP',
          createdById: payload.userId,
          assignedToId: payload.userId,
        }
      })

      // Let's create an active converted client
      const regularClient = await prisma.client.create({
        data: {
          name: 'Tony Stark',
          phone: '+12125550199',
          email: 'tony@starkindustries.com',
          status: 'CLIENTS',
          source: 'FACEBOOK',
          createdById: payload.userId,
          assignedToId: payload.userId,
        }
      })

      await prisma.socialMessage.createMany({
        data: [
          // Thread 1: WhatsApp (Sarah Connor) - Converted
          {
            platform: 'WHATSAPP',
            direction: 'INBOUND',
            senderName: 'Sarah Connor',
            to: '+14155552671',
            content: 'Hello, I saw your marketing workshop post. Do you guys offer customized corporate training programs?',
            status: 'RECEIVED',
            isLeadCaptured: true,
            clientId: prospectClient.id,
            createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
          },
          {
            platform: 'WHATSAPP',
            direction: 'OUTBOUND',
            senderName: 'System',
            to: '+14155552671',
            content: 'Hi Sarah! Yes, we offer corporate packages tailored to marketing teams. Let me know your team size!',
            status: 'DELIVERED',
            isLeadCaptured: true,
            clientId: prospectClient.id,
            createdAt: new Date(Date.now() - 3600000 * 1.8)
          },
          {
            platform: 'WHATSAPP',
            direction: 'INBOUND',
            senderName: 'Sarah Connor',
            to: '+14155552671',
            content: 'We have about 15 people in our digital marketing department. Can you send a detailed brochure?',
            status: 'RECEIVED',
            isLeadCaptured: true,
            clientId: prospectClient.id,
            createdAt: new Date(Date.now() - 3600000 * 1.5)
          },

          // Thread 2: Facebook (Tony Stark) - Converted (Client)
          {
            platform: 'FACEBOOK',
            direction: 'INBOUND',
            senderName: 'Tony Stark',
            to: 'tony.stark.99',
            content: 'Your agency dashboard looks pretty clean. Do you support multi-region campaign budgeting?',
            status: 'RECEIVED',
            isLeadCaptured: true,
            clientId: regularClient.id,
            createdAt: new Date(Date.now() - 3600000 * 5)
          },
          {
            platform: 'FACEBOOK',
            direction: 'OUTBOUND',
            senderName: 'System',
            to: 'tony.stark.99',
            content: 'Thanks Tony! Yes, our portal integrates regional tracking. I will assign a success manager to show you a demo.',
            status: 'DELIVERED',
            isLeadCaptured: true,
            clientId: regularClient.id,
            createdAt: new Date(Date.now() - 3600000 * 4)
          },

          // Thread 3: WhatsApp (Bruce Wayne) - Unconverted Lead
          {
            platform: 'WHATSAPP',
            direction: 'INBOUND',
            senderName: 'Bruce Wayne',
            to: '+16075550144',
            content: 'Interested in the digital lead generation package. What is the onboarding timeline?',
            status: 'RECEIVED',
            isLeadCaptured: false,
            createdAt: new Date(Date.now() - 3600000 * 8)
          },

          // Thread 4: LinkedIn (Peter Parker) - Unconverted Lead
          {
            platform: 'LINKEDIN',
            direction: 'INBOUND',
            senderName: 'Peter Parker',
            to: 'peter.parker.daily',
            content: 'Hey! Do you hire freelance content writers or photography managers for campaigns?',
            status: 'RECEIVED',
            isLeadCaptured: false,
            createdAt: new Date(Date.now() - 3600000 * 12)
          }
        ]
      })
    }

    // 2. Fetch all messages, including client details
    const messages = await prisma.socialMessage.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            assignedTo: { select: { name: true } }
          }
        }
      }
    })

    // 3. Group messages into conversation threads by unique combination of (platform + to)
    const threadMap: Record<string, {
      id: string
      platform: string
      to: string
      senderName: string | null
      latestMessage: string
      latestMessageTime: Date
      isLeadCaptured: boolean
      clientId: string | null
      client: any
      messages: any[]
    }> = {}

    for (const msg of messages) {
      const threadKey = `${msg.platform}:${msg.to}`
      if (!threadMap[threadKey]) {
        threadMap[threadKey] = {
          id: threadKey,
          platform: msg.platform,
          to: msg.to,
          senderName: msg.senderName,
          latestMessage: msg.content,
          latestMessageTime: msg.createdAt,
          isLeadCaptured: msg.isLeadCaptured,
          clientId: msg.clientId,
          client: msg.client,
          messages: []
        }
      }

      threadMap[threadKey].messages.push(msg)
      threadMap[threadKey].latestMessage = msg.content
      threadMap[threadKey].latestMessageTime = msg.createdAt
      threadMap[threadKey].isLeadCaptured = msg.isLeadCaptured
      if (msg.clientId) {
        threadMap[threadKey].clientId = msg.clientId
        threadMap[threadKey].client = msg.client
      }
    }

    // Sort threads by latest message time descending
    const threads = Object.values(threadMap).sort((a, b) => 
      b.latestMessageTime.getTime() - a.latestMessageTime.getTime()
    )

    return NextResponse.json({ threads })
  } catch (err) {
    console.error('[Social Inbox GET]', err)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

// POST endpoint to simulate sending a reply to a thread or receiving a new message
export async function POST(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  try {
    const { platform, to, content, direction, senderName } = await req.json()

    if (!platform || !to || !content) {
      return NextResponse.json({ error: 'Platform, recipient (to), and content are required' }, { status: 400 })
    }

    // If there is already a converted client linked to this recipient, associate the message
    const existingMessage = await prisma.socialMessage.findFirst({
      where: { platform, to, clientId: { not: null } }
    })

    const message = await prisma.socialMessage.create({
      data: {
        platform,
        direction: direction || 'OUTBOUND',
        senderName: senderName || (direction === 'INBOUND' ? 'Inbound Sender' : 'System'),
        to,
        content,
        status: direction === 'INBOUND' ? 'RECEIVED' : 'SENT',
        clientId: existingMessage?.clientId || null,
        isLeadCaptured: existingMessage ? true : false
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true
          }
        }
      }
    })

    // If it's a Facebook outbound message, send it via the Meta Graph API
    if (platform === 'FACEBOOK' && (direction === 'OUTBOUND' || !direction)) {
      let pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
      try {
        const dbSetting = await prisma.setting.findUnique({ where: { key: 'FACEBOOK_PAGE_ACCESS_TOKEN' } })
        if (dbSetting?.value) pageAccessToken = dbSetting.value
      } catch (dbErr) {
        console.error('[Social Inbox POST] Failed to fetch Page Access Token from DB:', dbErr)
      }

      if (pageAccessToken) {
        try {
          const fbRes = await fetch(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: to },
                message: { text: content }
              })
            }
          )
          if (!fbRes.ok) {
            const fbErrData = await fbRes.json()
            console.error('[Social Inbox POST] Facebook Send API error details:', fbErrData)
          } else {
            console.log(`[Social Inbox POST] Outbound message successfully transmitted to Facebook user (PSID: ${to})`)
          }
        } catch (fbErr) {
          console.error('[Social Inbox POST] Failed to transmit message to Meta Send API:', fbErr)
        }
      } else {
        console.warn('[Social Inbox POST] No Facebook Page Access Token configured. Message saved locally only.')
      }
    }

    return NextResponse.json({ success: true, message }, { status: 201 })
  } catch (err) {
    console.error('[Social Inbox POST]', err)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
