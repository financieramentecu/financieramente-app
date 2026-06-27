import { prisma } from '@/lib/prisma'

export async function getUserNotifications(userId: number) {
	return prisma.notification.findMany({
		where: { idUser: userId, isClosed: false },
		orderBy: { createdAt: 'desc' },
		include: {
			business: {
				select: {
					contract: true,
					user: { select: { name: true } },
				},
			},
		},
	})
}

export async function markNotificationAsRead(
	notificationId: number,
	userId: number
) {
	const notification = await prisma.notification.findFirst({
		where: { idNotification: notificationId, idUser: userId },
	})

	if (!notification) {
		throw new Error('Notification not found')
	}

	return prisma.notification.update({
		where: { idNotification: notificationId },
		data: { isRead: true },
	})
}

export async function markAllNotificationsAsRead(userId: number) {
	return prisma.notification.updateMany({
		where: { idUser: userId, isRead: false },
		data: { isRead: true },
	})
}

export async function closeNotification(
	notificationId: number,
	userId: number
) {
	const notification = await prisma.notification.findFirst({
		where: { idNotification: notificationId, idUser: userId },
	})

	if (!notification) {
		throw new Error('Notification not found')
	}

	return prisma.notification.update({
		where: { idNotification: notificationId },
		data: { isClosed: true },
	})
}
