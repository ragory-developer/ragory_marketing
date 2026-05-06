import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { google } from 'googleapis'

// Scopes per Google service — granular and professional
export const GOOGLE_SERVICES = {
  gmail: {
    label: 'Gmail',
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    dbKey: 'GOOGLE_GMAIL_REFRESH_TOKEN',
  },
  drive: {
    label: 'Google Drive',
    scopes: ['https://www.googleapis.com/auth/drive'],
    dbKey: 'GOOGLE_DRIVE_REFRESH_TOKEN',
  },
  sheets: {
    label: 'Google Sheets',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    dbKey: 'GOOGLE_SHEETS_REFRESH_TOKEN',
  },
  docs: {
    label: 'Google Docs',
    scopes: ['https://www.googleapis.com/auth/documents'],
    dbKey: 'GOOGLE_DOCS_REFRESH_TOKEN',
  },
  calendar: {
    label: 'Google Calendar',
    scopes: ['https://www.googleapis.com/auth/calendar'],
    dbKey: 'GOOGLE_CALENDAR_REFRESH_TOKEN',
  },
  forms: {
    label: 'Google Forms',
    scopes: ['https://www.googleapis.com/auth/forms.body'],
    dbKey: 'GOOGLE_FORMS_REFRESH_TOKEN',
  },
  meet: {
    label: 'Google Meet',
    // Meet is managed via Calendar API
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    dbKey: 'GOOGLE_MEET_REFRESH_TOKEN',
  },
} as const

export type GoogleServiceKey = keyof typeof GOOGLE_SERVICES

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const service = searchParams.get('service') as GoogleServiceKey

  if (!service || !GOOGLE_SERVICES[service]) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
  }

  const clientId = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_ID' } })
  const clientSecret = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_SECRET' } })

  if (!clientId?.value || !clientSecret?.value) {
    return NextResponse.json({ error: 'Google OAuth credentials not configured. Please add Client ID and Secret first.' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const oauth2Client = new google.auth.OAuth2(
    clientId.value,
    clientSecret.value,
    `${baseUrl}/api/auth/google/callback`
  )

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SERVICES[service].scopes,
    state: service, // pass service name through the OAuth flow
  })

  return NextResponse.json({ url })
}
