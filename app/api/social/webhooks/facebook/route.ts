import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import messageEmitter from '@/lib/events'

// GET handler for Meta validation challenge (handshake)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // The verification token configured in the Meta App Developer Settings
  let VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'my_crm_verify_token'
  try {
    const dbSetting = await prisma.setting.findUnique({ where: { key: 'FACEBOOK_WEBHOOK_VERIFY_TOKEN' } })
    if (dbSetting?.value) VERIFY_TOKEN = dbSetting.value
  } catch (e) {
    console.error('Failed to read verify token from setting table:', e)
  }

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Validation successful!')
    return new Response(challenge, { status: 200 })
  }
  
  console.warn('[Meta Webhook] Validation failed: token or mode mismatch.')
  return new Response('Verification failed', { status: 403 })
}

// POST handler to receive incoming Messenger payloads
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Ensure it is a page subscription event
    if (body.object === 'page') {
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            const senderId = messagingEvent.sender?.id // Page Scoped User ID (PSID)
            const messageText = messagingEvent.message?.text

            if (senderId && messageText) {
              let senderName = 'Facebook User'
              
              // 1. Fetch sender profile details from Meta Graph API
              let pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
              try {
                const dbSetting = await prisma.setting.findUnique({ where: { key: 'FACEBOOK_PAGE_ACCESS_TOKEN' } })
                if (dbSetting?.value) pageAccessToken = dbSetting.value
              } catch (e) {
                console.error('[Meta Webhook] Failed to read page access token from setting table:', e)
              }

              if (pageAccessToken) {
                try {
                  const profileRes = await fetch(
                    `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${pageAccessToken}`,
                    { signal: AbortSignal.timeout(5000) }
                  )
                  if (profileRes.ok) {
                    const profile = await profileRes.json()
                    if (profile.first_name || profile.last_name) {
                      senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    }
                  }
                } catch (e) {
                  console.error('[Meta Webhook] Failed to fetch Facebook profile:', e)
                }
              }

              // 2. Check if a CRM Client is already linked (by phone/PSID or facebookUrl)
              const linkedClient = await prisma.client.findFirst({
                where: {
                  OR: [
                    { phone: senderId },
                    { facebookUrl: senderId },
                    { facebookUrl: `https://facebook.com/${senderId}` }
                  ]
                }
              })

              // 3. Save to local SocialMessage database
              await prisma.socialMessage.create({
                data: {
                  platform: 'FACEBOOK',
                  direction: 'INBOUND',
                  senderName: senderName,
                  to: senderId, // Store PSID so we can respond
                  content: messageText,
                  status: 'RECEIVED',
                  clientId: linkedClient?.id || null,
                  isLeadCaptured: !!linkedClient
                }
              })

              console.log(`[Meta Webhook] Inbound chat saved from ${senderName} (PSID: ${senderId})`)
              
              // Broadcast message event to SSE stream
              messageEmitter.emit('new-message')
            }
          }
        }
      }
      return new Response('EVENT_RECEIVED', { status: 200 })
    }
    return new Response('Not Found', { status: 404 })
  } catch (err) {
    console.error('[Meta Webhook] POST error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
