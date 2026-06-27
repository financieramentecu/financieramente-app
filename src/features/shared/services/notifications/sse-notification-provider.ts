import { INotificationProvider } from './notification-provider.interface'
import { Notification } from '@prisma/client'
import { sseStore } from './sse-store'

/**
 * SSENotificationProvider
 *
 * Implements INotificationProvider using Server-Sent Events.
 * No third-party service required — works entirely within Next.js.
 *
 * To swap for Pusher or Firebase in the future:
 *   1. Create a new file (e.g. pusher-notification-provider.ts)
 *   2. Implement INotificationProvider
 *   3. Change the export below — zero changes in services or API routes.
 */
export class SSENotificationProvider implements INotificationProvider {
  async sendNotification(userId: number, notification: Notification): Promise<void> {
    sseStore.send(userId, 'new-notification', notification)
  }
}

export const notificationProvider = new SSENotificationProvider()
