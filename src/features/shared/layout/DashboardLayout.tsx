'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/features/shared/ui/sidebar'
import { AppSidebar } from './Sidebar'
import { SiteHeader } from './Header'
import { ImpersonationBanner } from './ImpersonationBanner'
import { buildBreadcrumbsFromPathname } from '@/lib/navigation/breadcrumb-utils'
import { cn } from '@/lib/utils'

import { NotificationsProvider } from '@/features/shared/components/notifications/NotificationsContext'
import { NotificationDrawer } from '@/features/shared/components/notifications/NotificationDrawer'

interface DashboardLayoutProps {
	children: React.ReactNode
	currentPage?: string
	breadcrumbs?: { label: string; href?: string }[]
	disableScroll?: boolean
}

export function DashboardLayout({
	children,
	currentPage = 'Dashboard',
	breadcrumbs: breadcrumbsProp,
	disableScroll = false,
}: DashboardLayoutProps) {
	const pathname = usePathname()
	const breadcrumbs = breadcrumbsProp ?? (pathname ? buildBreadcrumbsFromPathname(pathname) : [])

	return (
		<NotificationsProvider>
			<SidebarProvider defaultOpen={true} className="h-[100dvh] overflow-hidden">
				{/* Forzar el body a no tener scroll cuando disableScroll es true (solo en pantallas de escritorio) */}
				{disableScroll && (
					<style jsx global>{`
						@media (min-width: 1024px) {
							html, body {
								overflow: hidden !important;
								height: 100% !important;
							}
						}
					`}</style>
				)}
				<AppSidebar />
				<SidebarInset className="flex flex-col flex-1 min-h-0 min-w-0 w-full overflow-hidden bg-background">
					<ImpersonationBanner />
					{/* Header y Miga de pan - Altura automática */}
					<SiteHeader title={currentPage} breadcrumbs={breadcrumbs} />
					
					{/* Contenedor principal que flexiona con el Drawer */}
					<div className="flex-1 flex overflow-hidden w-full">
						{/* Contenido que llena el resto de la pantalla (100vh - header) */}
						<div className={cn('flex-1 flex flex-col min-h-0 min-w-0', !disableScroll ? 'overflow-y-auto' : 'overflow-y-auto lg:overflow-hidden')}>
							<div className={cn('flex flex-col gap-4 p-4 min-h-0 min-w-0 w-full', disableScroll ? 'lg:flex-1 lg:overflow-hidden' : '')}>
								{children}
							</div>
						</div>
						
						{/* Notification Drawer (Desplaza el contenido) */}
						<NotificationDrawer />
					</div>
				</SidebarInset>
			</SidebarProvider>
		</NotificationsProvider>
	)
}
