import { NextRequest } from 'next/server'
import messageEmitter from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let onNewMessage: (() => void) | null = null

  const responseStream = new ReadableStream({
    start(controller) {
      onNewMessage = () => {
        try {
          controller.enqueue(`data: refresh\n\n`)
        } catch (e) {
          console.error('[SSE Stream] Failed to enqueue event:', e)
        }
      }

      messageEmitter.on('new-message', onNewMessage)
      
      // Send initial connection confirmation event
      controller.enqueue(`data: connected\n\n`)
    },
    cancel() {
      if (onNewMessage) {
        messageEmitter.off('new-message', onNewMessage)
      }
    }
  })

  // Clean up listener when connection aborts (tab closed / navigated away)
  req.signal.addEventListener('abort', () => {
    if (onNewMessage) {
      messageEmitter.off('new-message', onNewMessage)
    }
  })

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    }
  })
}
