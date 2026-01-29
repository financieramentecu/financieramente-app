'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/features/shared/ui/sidebar'
import { AppSidebar } from './Sidebar'
import { SiteHeader } from './Header'
import { buildBreadcrumbsFromPathname } from '@/lib/navigation/breadcrumb-utils'

interface DashboardLayoutProps {
	children: React.ReactNode
	currentPage?: string
	breadcrumbs?: { label: string; href?: string }[]
}

export function DashboardLayout({
	children,
	currentPage = 'Dashboard',
	breadcrumbs: breadcrumbsProp,
}: DashboardLayoutProps) {
	const pathname = usePathname()
	const breadcrumbs = breadcrumbsProp ?? (pathname ? buildBreadcrumbsFromPathname(pathname) : [])

	return (
		<SidebarProvider defaultOpen={true}>
			<AppSidebar />
			<SidebarInset className="flex flex-col h-screen overflow-hidden">
				{/* Header fijo */}
				<div className="sticky top-0 z-50 bg-background">
					<SiteHeader title={currentPage} breadcrumbs={breadcrumbs} />
				</div>
				{/* Contenido con scroll */}
				<div className="flex-1 overflow-y-auto">
					<div className="flex flex-col gap-4 p-4 pt-4">{children}</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
