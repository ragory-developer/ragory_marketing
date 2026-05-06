import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { google } from 'googleapis'
import { GOOGLE_SERVICES, GoogleServiceKey } from '@/lib/google'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const service = searchParams.get('state') as GoogleServiceKey // service passed via state param
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!code || !service || !GOOGLE_SERVICES[service]) {
    return NextResponse.redirect(new URL('/settings?error=InvalidCallback', baseUrl))
  }

  try {
    const clientId = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_ID' } })
    const clientSecret = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_SECRET' } })

    const oauth2Client = new google.auth.OAuth2(
      clientId!.value,
      clientSecret!.value,
      `${baseUrl}/api/auth/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      // No refresh token means user was already authorized — redirect and treat as success
      console.warn(`[Google OAuth] No refresh_token returned for service: ${service}. User may need to re-authorize.`)
    }

    const tokenToSave = tokens.refresh_token || tokens.access_token
    const dbKey = GOOGLE_SERVICES[service].dbKey

    await prisma.setting.upsert({
      where: { key: dbKey },
      update: { value: tokenToSave! },
      create: { key: dbKey, value: tokenToSave! }
    })

    console.log(`[Google OAuth] ✓ ${GOOGLE_SERVICES[service].label} connected successfully`)
    return NextResponse.redirect(new URL(`/settings?success=${service}`, baseUrl))
  } catch (error) {
    console.error('[Google OAuth] Callback Error:', error)
    return NextResponse.redirect(new URL(`/settings?error=OAuthFailed&service=${service}`, baseUrl))
  }
}
