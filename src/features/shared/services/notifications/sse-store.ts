/**
 * SSE Connection Store
 *
 * Stores active ReadableStream controllers keyed by userId.
 * Works in a single-process environment (local dev, Docker container, VPS).
 * For multi-instance deployments swap this for a shared pub/sub (Redis, etc.)
 * without changing any other layer — just swap the provider.
 */

type Controller = ReadableStreamDefaultController<Uint8Array>

// Map: userId -> Set of open SSE controllers (one user can have multiple tabs)
// Uses globalThis to survive Next.js Fast Refresh and ensure a true singleton
const globalForSse = globalThis as unknown as { sseClients: Map<number, Set<Controller>> }
const sseClients = globalForSse.sseClients || new Map<number, Set<Controller>>()
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  globalForSse.sseClients = sseClients
}

export const sseStore = {
  add(userId: number, controller: Controller): void {
    if (!sseClients.has(userId)) {
      sseClients.set(userId, new Set())
    }
    sseClients.get(userId)!.add(controller)
  },

  remove(userId: number, controller: Controller): void {
    const controllers = sseClients.get(userId)
    if (!controllers) return
    controllers.delete(controller)
    if (controllers.size === 0) sseClients.delete(userId)
  },

  send(userId: number, event: string, data: unknown): void {
    const controllers = sseClients.get(userId)
    if (!controllers || controllers.size === 0) return

    const encoder = new TextEncoder()
    const payload = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

    for (const ctrl of controllers) {
      try {
        ctrl.enqueue(payload)
      } catch {
        // Controller is closed — clean up
        controllers.delete(ctrl)
      }
    }
  },
}
