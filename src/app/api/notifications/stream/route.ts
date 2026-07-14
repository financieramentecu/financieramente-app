import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { sseStore } from '@/features/shared/services/notifications/sse-store'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/notifications/stream
 *
 * Opens a persistent Server-Sent Events connection for the authenticated user.
 * The client receives real-time `new-notification` events pushed from the server
 * whenever a new notification is created.
 *
 * To swap the transport layer (e.g. to Pusher or Firebase) in the future:
 *   - Remove or ignore this route
 *   - Switch the provider in sse-notification-provider.ts
 *   - Update use-notifications.ts on the client
 *   Zero changes needed in business logic or services.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUser = await getCurrentUserByEmail(session.user.email)
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userId = currentUser.idUser
  let controller: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl
      sseStore.add(userId, controller)

      // Keep-alive ping every 25 seconds to prevent proxy timeouts
      const encoder = new TextEncoder()
      const keepAliveInterval = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(keepAliveInterval)
        }
      }, 25_000)

      // Clean up when the connection closes
      void (async () => {
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            try {
              // If enqueueing throws, the stream is closed
              ctrl.enqueue(encoder.encode(''))
            } catch {
              clearInterval(check)
              resolve()
            }
          }, 5_000)
        })
        clearInterval(keepAliveInterval)
        sseStore.remove(userId, controller)
      })()
    },
    cancel() {
      sseStore.remove(userId, controller)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering if behind a proxy
    },
  })
}
