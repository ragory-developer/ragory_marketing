import { google } from 'googleapis'
import prisma from './prisma'
import { GOOGLE_SERVICES, GoogleServiceKey } from '@/app/api/auth/google/url/route'

export async function getGoogleAuth(service?: GoogleServiceKey) {
  // Check for OAuth first
  const clientId = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_ID' } })
  const clientSecret = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_SECRET' } })

  if (clientId?.value && clientSecret?.value) {
    let refreshTokens = []
    if (service && GOOGLE_SERVICES[service]) {
      refreshTokens.push(await prisma.setting.findUnique({ where: { key: GOOGLE_SERVICES[service].dbKey } }))
    }
    
    // Fallback if no specific service passed (e.g. from existing sheets endpoint)
    if (!service) {
      refreshTokens.push(await prisma.setting.findUnique({ where: { key: 'GOOGLE_SHEETS_REFRESH_TOKEN' } }))
      refreshTokens.push(await prisma.setting.findUnique({ where: { key: 'GOOGLE_DRIVE_REFRESH_TOKEN' } }))
    }

    const validToken = refreshTokens.find(t => t && t.value)

    if (validToken?.value) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const oauth2Client = new google.auth.OAuth2(
        clientId.value,
        clientSecret.value,
        `${baseUrl}/api/auth/google/callback`
      )
      oauth2Client.setCredentials({ refresh_token: validToken.value })
      return oauth2Client
    }
  }

  // Fallback to Service Account
  const setting = await prisma.setting.findUnique({
    where: { key: 'GOOGLE_SERVICE_ACCOUNT' }
  })

  if (setting && setting.value) {
    const credentials = JSON.parse(setting.value)
    return new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/presentations'
      ]
    })
  }

  throw new Error('Google connection is not configured. Please connect via Settings.')
}
