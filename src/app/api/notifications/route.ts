import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
	getUserNotifications,
	markAllNotificationsAsRead,
} from '@/features/notifications/services/notifications.service'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

export async function GET() {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await getCurrentUserByEmail(session.user.email)
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		const notifications = await getUserNotifications(user.idUser)
		return NextResponse.json(notifications)
	} catch (error) {
		console.error('Error in GET /api/notifications:', error)
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		)
	}
}

export async function PUT() {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await getCurrentUserByEmail(session.user.email)
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		await markAllNotificationsAsRead(user.idUser)
		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error in PUT /api/notifications:', error)
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		)
	}
}
