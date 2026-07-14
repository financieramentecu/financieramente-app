'use client'

import React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { useNotificationsContext } from './NotificationsContext'

export function NotificationBell() {
	const { unreadCount, isOpen, setIsOpen } = useNotificationsContext()

	return (
		<Button
			variant="ghost"
			size="icon"
			className="relative text-[#11525B] hover:bg-[#11525B]/10 hover:text-[#11525B]"
			onClick={() => setIsOpen(!isOpen)}
		>
			<Bell className="h-5 w-5" />
			{unreadCount > 0 && (
				<span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
					{unreadCount}
				</span>
			)}
		</Button>
	)
}
