import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NoteType } from '@prisma/client'

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const { scheduledDateTime, messages } = await req.json()

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  const [apiKeySetting, senderIdSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'MRAM_SMS_API_KEY' } }),
    prisma.setting.findUnique({ where: { key: 'MRAM_SMS_SENDER_ID' } }),
  ])

  const API_KEY  = apiKeySetting?.value  || process.env.MRAM_SMS_API_KEY
  const SENDER_ID = senderIdSetting?.value || process.env.MRAM_SMS_SENDER_ID

  if (!API_KEY || !SENDER_ID) {
    return NextResponse.json({ error: 'SMS Gateway is not configured.' }, { status: 500 })
  }

  // Prepare payload for MRAM Bulk SMS API
  const mramMessages = messages.map((m: any) => {
    let formattedPhone = m.to.replace(/[^0-9]/g, '')
    if (formattedPhone.startsWith('01')) formattedPhone = '88' + formattedPhone
    return {
      to: formattedPhone,
      message: m.message
    }
  })

  try {
    const smsResponse = await fetch('https://msg.mram.com.bd/smsapimany', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: API_KEY,
        senderid: SENDER_ID,
        scheduledDateTime: scheduledDateTime || '',
        messages: mramMessages,
      }),
    })

    if (!smsResponse.ok) {
      const errorText = await smsResponse.text()
      console.error('[Bulk SMS] Provider error:', errorText)
      return NextResponse.json({ error: 'SMS Provider failed' }, { status: 502 })
    }

    // Now log everything to the DB
    const clientIds = messages.map((m: any) => m.clientId).filter(Boolean)
    const notesData = messages.map((m: any, index: number) => {
      let noteContent = `[Bulk SMS to ${mramMessages[index].to}] ${m.message}`
      if (scheduledDateTime) noteContent += ` (Scheduled: ${new Date(scheduledDateTime).toLocaleString()})`
      return {
        clientId: m.clientId,
        authorId: payload.userId as string,
        content: noteContent,
        type: NoteType.SMS,
      }
    }).filter((n: any) => Boolean(n.clientId))

    if (notesData.length > 0) {
      await prisma.$transaction([
        prisma.clientNote.createMany({
          data: notesData
        }),
        prisma.client.updateMany({
          where: { id: { in: clientIds } },
          data: { lastFollowUpAt: new Date() }
        })
      ])
    }

    return NextResponse.json({ success: true, count: mramMessages.length })

  } catch (err: any) {
    console.error('[Bulk SMS] Caught error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
