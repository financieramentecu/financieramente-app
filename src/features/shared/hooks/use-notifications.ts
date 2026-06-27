'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Notification {
	idNotification: number
	idUser: number
	idBusiness: number
	title: string
	message: string
	isRead: boolean
	isClosed: boolean
	createdAt: string
	business?: {
		contract: string
		user: { name: string }
	}
}

export function useNotifications(userId: number) {
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [unreadCount, setUnreadCount] = useState(0)

	const fetchNotifications = useCallback(async () => {
		try {
			const res = await fetch('/api/notifications')
			if (!res.ok) throw new Error('Failed to fetch notifications')
			const data = await res.json()
			setNotifications(data)
			setUnreadCount(data.filter((n: Notification) => !n.isRead).length)
		} catch (error) {
			console.error('Error fetching notifications:', error)
		}
	}, [])

	useEffect(() => {
		fetchNotifications()

		// Open SSE connection — native browser API, no third-party library needed.
		// To swap the transport (Pusher, Firebase, etc.) in the future:
		//   1. Remove this block
		//   2. Add the new provider subscription here
		//   Zero changes needed in the rest of this hook.
		const eventSource = new EventSource('/api/notifications/stream')

		eventSource.addEventListener('new-notification', (e) => {
			try {
				const newNotification: Notification = JSON.parse(e.data)
				// Only show notifications relevant to this user
				if (newNotification.idUser !== userId) return
				setNotifications((prev) => [newNotification, ...prev])
				setUnreadCount((prev) => prev + 1)
			} catch {
				console.error('Error parsing SSE notification:', e.data)
			}
		})

		eventSource.onerror = () => {
			// Browser will auto-reconnect on error — no manual retry needed
		}

		return () => {
			eventSource.close()
		}
	}, [userId, fetchNotifications])


	const markAsRead = async (id: number) => {
		try {
			await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
			setNotifications((prev) =>
				prev.map((n) => (n.idNotification === id ? { ...n, isRead: true } : n))
			)
			setUnreadCount((prev) => Math.max(0, prev - 1))
		} catch (error) {
			console.error('Error marking as read:', error)
		}
	}

	const markAllAsRead = async () => {
		try {
			await fetch('/api/notifications', { method: 'PUT' })
			setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
			setUnreadCount(0)
		} catch (error) {
			console.error('Error marking all as read:', error)
		}
	}

	const closeNotification = async (id: number) => {
		try {
			await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
			setNotifications((prev) => {
				const filtered = prev.filter((n) => n.idNotification !== id)
				setUnreadCount(filtered.filter((n) => !n.isRead).length)
				return filtered
			})
		} catch (error) {
			console.error('Error closing notification:', error)
		}
	}

	return {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		closeNotification,
		fetchNotifications,
	}
}
