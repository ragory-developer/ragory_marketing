import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { google } from 'googleapis'
import { GOOGLE_SERVICES, GoogleServiceKey } from '@/lib/google'

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
    scope: GOOGLE_SERVICES[service].scopes as string[],
    state: service, // pass service name through the OAuth flow
  })

  return NextResponse.json({ url })
}
