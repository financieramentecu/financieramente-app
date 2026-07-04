'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useNotifications, Notification } from '@/features/shared/hooks/use-notifications'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'

import { isToday, isYesterday, subDays, isAfter } from 'date-fns'

export type StatusFilter = 'ALL' | 'UNREAD'
export type DateFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS'

interface NotificationsContextType {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
	notifications: Notification[]
	unreadCount: number
	markAsRead: (id: number) => Promise<void>
	markAllAsRead: () => Promise<void>
	closeNotification: (id: number) => Promise<void>
	
	statusFilter: StatusFilter
	setStatusFilter: (s: StatusFilter) => void
	dateFilter: DateFilter
	setDateFilter: (d: DateFilter) => void
	
	filteredNotifications: Notification[]
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
	const { user } = useAuthSession()
	const {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		closeNotification,
	} = useNotifications(user?.id ? Number(user.id) : 0)

	const [isOpen, setIsOpen] = useState(false)
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
	const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')

	const filteredNotifications = notifications.filter((n) => {
		// 1. Status Filter
		if (statusFilter === 'UNREAD' && n.isRead) return false

		// 2. Date Filter
		if (dateFilter !== 'ALL') {
			const date = new Date(n.createdAt)
			const now = new Date()
			
			if (dateFilter === 'TODAY' && !isToday(date)) return false
			if (dateFilter === 'YESTERDAY' && !isYesterday(date)) return false
			if (dateFilter === 'LAST_7_DAYS' && !isAfter(date, subDays(now, 7))) return false
			if (dateFilter === 'LAST_30_DAYS' && !isAfter(date, subDays(now, 30))) return false
		}

		return true
	})

	return (
		<NotificationsContext.Provider
			value={{
				isOpen,
				setIsOpen,
				notifications,
				unreadCount,
				markAsRead,
				markAllAsRead,
				closeNotification,
				
				statusFilter,
				setStatusFilter,
				dateFilter,
				setDateFilter,
				
				filteredNotifications,
			}}
		>
			{children}
		</NotificationsContext.Provider>
	)
}

export function useNotificationsContext() {
	const context = useContext(NotificationsContext)
	if (context === undefined) {
		throw new Error('useNotificationsContext must be used within a NotificationsProvider')
	}
	return context
}
