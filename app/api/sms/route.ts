import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NoteType } from '@prisma/client'

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  const { clientId, phone, message, scheduledDateTime, type } = await req.json()

  if (!clientId || !phone || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

  let formattedPhone = phone.replace(/[^0-9]/g, '')
  if (formattedPhone.startsWith('01')) formattedPhone = '88' + formattedPhone

  const smsResponse = await fetch('https://msg.mram.com.bd/smsapi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: API_KEY,
      senderid: SENDER_ID,
      type: type || 'text',
      contacts: formattedPhone,
      msg: message,
      scheduledDateTime: scheduledDateTime || '',
    }),
  })

  if (!smsResponse.ok) {
    const errorText = await smsResponse.text()
    console.error('[SMS] Provider error:', errorText)
    return NextResponse.json({ error: 'SMS Provider failed' }, { status: 502 })
  }

  let noteContent = `[SMS to ${formattedPhone}] ${message}`
  if (scheduledDateTime) noteContent += ` (Scheduled: ${new Date(scheduledDateTime).toLocaleString()})`

  const [note] = await Promise.all([
    prisma.clientNote.create({
      data: {
        clientId,
        authorId: payload.userId as string,
        content: noteContent,
        type: NoteType.SMS,
      },
      include: { author: { select: { name: true } } },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: { lastFollowUpAt: new Date() },
    }),
  ])

  return NextResponse.json({ success: true, note })
}
