import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NoteType } from '@prisma/client'

export async function POST(req: NextRequest) {
  const token = cookies().get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { clientId, phone, message, scheduledDateTime, type } = await req.json()

    if (!clientId || !phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch API Key and Sender ID from settings (or .env fallback)
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: 'MRAM_SMS_API_KEY' } })
    const senderIdSetting = await prisma.setting.findUnique({ where: { key: 'MRAM_SMS_SENDER_ID' } })

    const API_KEY = apiKeySetting?.value || process.env.MRAM_SMS_API_KEY
    const SENDER_ID = senderIdSetting?.value || process.env.MRAM_SMS_SENDER_ID

    if (!API_KEY || !SENDER_ID) {
      return NextResponse.json({ error: 'SMS Gateway is not configured. Please contact Super Admin.' }, { status: 500 })
    }

    // Format phone number to start with 88
    let formattedPhone = phone.replace(/[^0-9]/g, '')
    if (formattedPhone.startsWith('01')) formattedPhone = '88' + formattedPhone

    // Call MRAM Single Message API
    const smsResponse = await fetch('https://msg.mram.com.bd/smsapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: API_KEY,
        senderid: SENDER_ID,
        type: type || 'text',
        contacts: formattedPhone,
        msg: message,
        scheduledDateTime: scheduledDateTime || ""
      })
    })

    if (!smsResponse.ok) {
      const errorText = await smsResponse.text()
      console.error('MRAM API Error:', errorText)
      throw new Error('SMS Provider failed')
    }

    // Log the SMS in the client's history
    let noteContent = `[SMS to ${formattedPhone}] ${message}`
    if (scheduledDateTime) noteContent += ` (Scheduled: ${new Date(scheduledDateTime).toLocaleString()})`

    const note = await prisma.clientNote.create({
      data: {
        clientId,
        authorId: payload.userId,
        content: noteContent,
        type: NoteType.SMS
      },
      include: { author: { select: { name: true } } }
    })

    // Update last follow-up
    await prisma.client.update({
      where: { id: clientId },
      data: { lastFollowUpAt: new Date() }
    })

    return NextResponse.json({ success: true, note }, { status: 200 })
  } catch (error: any) {
    console.error('SMS Send Error:', error)
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
  }
}
