import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { GOOGLE_SERVICES, GoogleServiceKey } from '@/lib/google'

// GET — return connection status for all services + whether credentials are configured
export async function GET() {
  try {
    const clientId = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_ID' } })
    const clientSecret = await prisma.setting.findUnique({ where: { key: 'GOOGLE_CLIENT_SECRET' } })

    const hasCredentials = !!(clientId?.value && clientSecret?.value)

    // Returning empty services for now as requested to avoid Google API errors
    return NextResponse.json({ 
      hasCredentials, 
      services: {} 
    })
  } catch (error) {
    console.error('[Settings GET]', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

// PUT — save OAuth credentials (Client ID + Secret)
export async function PUT(req: Request) {
  try {
    const body = await req.json()

    if (body.googleClientId && body.googleClientSecret) {
      await prisma.setting.upsert({
        where: { key: 'GOOGLE_CLIENT_ID' },
        update: { value: body.googleClientId.trim() },
        create: { key: 'GOOGLE_CLIENT_ID', value: body.googleClientId.trim() }
      })
      await prisma.setting.upsert({
        where: { key: 'GOOGLE_CLIENT_SECRET' },
        update: { value: body.googleClientSecret.trim() },
        create: { key: 'GOOGLE_CLIENT_SECRET', value: body.googleClientSecret.trim() }
      })
      return NextResponse.json({ success: true })
    }

    if (body.googleServiceAccountJson) {
      try {
        const parsed = JSON.parse(body.googleServiceAccountJson)
        if (!parsed.client_email || !parsed.private_key) {
          return NextResponse.json({ error: 'Invalid Service Account JSON: missing client_email or private_key.' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Malformed JSON. Please paste the entire downloaded file.' }, { status: 400 })
      }
      await prisma.setting.upsert({
        where: { key: 'GOOGLE_SERVICE_ACCOUNT' },
        update: { value: body.googleServiceAccountJson },
        create: { key: 'GOOGLE_SERVICE_ACCOUNT', value: body.googleServiceAccountJson }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  } catch (error) {
    console.error('[Settings PUT]', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

// DELETE — disconnect a specific service or all credentials
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const service = body.service as GoogleServiceKey | 'all' | undefined

    if (service === 'all') {
      await prisma.setting.deleteMany({
        where: { key: { in: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', ...Object.values(GOOGLE_SERVICES).map(s => s.dbKey)] } }
      })
    } else if (service && GOOGLE_SERVICES[service]) {
      await prisma.setting.deleteMany({ where: { key: GOOGLE_SERVICES[service].dbKey } })
    } else {
      return NextResponse.json({ error: 'Invalid service to disconnect' }, { status: 400 })
    }

    console.log(`[Settings DELETE] Disconnected: ${service}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Settings DELETE]', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
