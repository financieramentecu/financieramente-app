import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
	markNotificationAsRead,
	closeNotification,
} from '@/features/notifications/services/notifications.service'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await getCurrentUserByEmail(session.user.email)
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		const { id } = await params
		const notificationId = parseInt(id, 10)
		if (isNaN(notificationId)) {
			return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
		}

		await markNotificationAsRead(notificationId, user.idUser)
		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error in PATCH /api/notifications/[id]:', error)
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		)
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await getCurrentUserByEmail(session.user.email)
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		const { id } = await params
		const notificationId = parseInt(id, 10)
		if (isNaN(notificationId)) {
			return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
		}

		await closeNotification(notificationId, user.idUser)
		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error in DELETE /api/notifications/[id]:', error)
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		)
	}
}
