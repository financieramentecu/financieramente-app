'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/features/shared/ui/button'
import { useNotificationsContext, DateFilter } from './NotificationsContext'
import { Notification } from '@/features/shared/hooks/use-notifications'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select'

export function NotificationDrawer() {
	const {
		isOpen,
		setIsOpen,
		unreadCount,
		markAsRead,
		markAllAsRead,
		closeNotification,
		statusFilter,
		setStatusFilter,
		dateFilter,
		setDateFilter,
		filteredNotifications,
	} = useNotificationsContext()
	
	const router = useRouter()

	if (!isOpen) return null

	const handleNotificationClick = async (notif: Notification) => {
		if (!notif.isRead) {
			await markAsRead(notif.idNotification)
		}
		setIsOpen(false)
		if (notif.callbackUrl) {
			router.push(notif.callbackUrl)
		}
	}

	return (
		<div className="absolute right-0 top-0 h-full z-50 shadow-xl w-80 sm:w-96 shrink-0 bg-background border-l flex flex-col animate-in slide-in-from-right duration-300">
			<div className="p-4 border-b flex items-center justify-between shrink-0">
				<h2 className="font-semibold text-lg">Notificaciones</h2>
				<div className="flex gap-2">
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="text-xs text-muted-foreground hover:text-primary"
							onClick={markAllAsRead}
						>
							<Check className="mr-1 h-4 w-4" />
							Marcar leídas
						</Button>
					)}
					<Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
						<X className="h-5 w-5" />
					</Button>
				</div>
			</div>

			<div className="p-3 border-b flex flex-col gap-3 shrink-0 bg-muted/5">
				{/* Filtro de Estado (Tabs) */}
				<div className="flex gap-2">
					<Button
						variant={statusFilter === 'ALL' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setStatusFilter('ALL')}
						className="text-xs flex-1 h-8 bg-white data-[state=active]:bg-[#11525B] data-[state=active]:text-white"
						data-state={statusFilter === 'ALL' ? 'active' : 'inactive'}
					>
						Todas
					</Button>
					<Button
						variant={statusFilter === 'UNREAD' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setStatusFilter('UNREAD')}
						className="text-xs flex-1 h-8 bg-white data-[state=active]:bg-[#11525B] data-[state=active]:text-white"
						data-state={statusFilter === 'UNREAD' ? 'active' : 'inactive'}
					>
						Nuevas {unreadCount > 0 && `(${unreadCount})`}
					</Button>
				</div>

				{/* Filtros de Dropdown (Fecha) */}
				<div className="flex gap-2">
					<div className="flex-1 min-w-0">
						<Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
							<SelectTrigger className="h-8 text-xs bg-white">
								<SelectValue placeholder="Fecha" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Cualquier fecha</SelectItem>
								<SelectItem value="TODAY">Hoy</SelectItem>
								<SelectItem value="YESTERDAY">Ayer</SelectItem>
								<SelectItem value="LAST_7_DAYS">Últimos 7 días</SelectItem>
								<SelectItem value="LAST_30_DAYS">Últimos 30 días</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
				{filteredNotifications.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-40 text-center">
						<p className="text-sm text-muted-foreground">No hay notificaciones</p>
					</div>
				) : (
					filteredNotifications.map((notif) => (
						<div
							key={notif.idNotification}
							className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-colors cursor-pointer hover:shadow-sm bg-white ${
								notif.isRead ? 'border-border/50 opacity-80' : 'border-primary/20 shadow-sm'
							}`}
							onClick={() => handleNotificationClick(notif)}
						>
							<div className="flex justify-between items-start gap-2">
								<h3 className="font-semibold text-sm text-[#11525B] leading-tight flex-1 pr-6">
									{notif.title}
								</h3>
								<div className="flex items-center gap-2 shrink-0">
									{!notif.isRead && (
										<span className="h-2 w-2 rounded-full bg-[#11525B]" />
									)}
									<button
										className="text-[#11525B] hover:text-red-500 transition-colors p-1 rounded-md hover:bg-muted"
										onClick={(e) => {
											e.stopPropagation()
											closeNotification(notif.idNotification)
										}}
										aria-label="Eliminar"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>
							
							<p className="text-sm text-muted-foreground leading-relaxed">
								{notif.message}
							</p>
							
							<span className="text-xs text-[#11525B]/70 mt-1">
								{formatDistanceToNow(new Date(notif.createdAt), {
									addSuffix: true,
									locale: es,
								})}
							</span>
						</div>
					))
				)}
			</div>
		</div>
	)
}
