import { Notification } from '@prisma/client'

export interface INotificationProvider {
	sendNotification(userId: number, notification: Notification): Promise<void>
}
