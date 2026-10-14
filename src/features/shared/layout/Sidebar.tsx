'use client'

import * as React from 'react'
import { NavMain } from '../layout/nav-main'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
} from '@/features/shared/ui/sidebar'

import Link from 'next/link'
import { useSidebar } from '@/features/shared/ui/sidebar'
import { BrandLogo } from '@/features/shared/ui/brand-logo'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { buildMenuByRole } from '@/lib/navigation/menu-builder'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'
import { useAuthorizedReportCodes } from '@/features/report-permissions/hooks/use-authorized-report-codes'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { state } = useSidebar()
	const { session, isLoading } = useAuthSession()
	const { enabled: isCalculadoraEnabled } = useFeatureFlag(
		'dashboard_calculadora'
	)
	const { enabled: isDashboardEnabled } = useFeatureFlag('production_dashboard')
	const { codes: authorizedReportCodes } = useAuthorizedReportCodes()
	const isCollapsed = state === 'collapsed'

	// Build menu from role, permissions, and authorized report codes
	const menuItems = React.useMemo(() => {
		if (!session?.user) {
			return []
		}

		let items = buildMenuByRole(session.user.role, session.user.permissions, {
			isCalculadoraEnabled,
			authorizedReportCodes,
		})

		// Hide production dashboard when feature flag is off
		if (!isDashboardEnabled) {
			items = items.filter((item) => item.url !== '/dashboard')
		}

		return items
	}, [session, isCalculadoraEnabled, isDashboardEnabled, authorizedReportCodes])

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:p-0! sidebar-button sidebar-brand-button h-16 w-full"
						>
							<Link
								href="/dashboard"
								className={
									isCollapsed
										? 'flex h-full w-full items-center justify-center px-0'
										: 'flex h-full w-full items-center justify-center px-3'
								}
							>
								<BrandLogo
									variant={isCollapsed ? 'mark' : 'on-dark'}
									priority
									className={
										isCollapsed ? 'size-11' : 'h-9 w-auto max-w-[11rem]'
									}
								/>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{isLoading ? <NavMainSkeleton /> : <NavMain items={menuItems} />}
			</SidebarContent>
		</Sidebar>
	)
}

const NAV_SKELETON_WIDTHS = ['64%', '76%', '72%', '79%', '69%'] as const

/**
 * Placeholder mientras la sesión (rol/permisos) todavía está resolviendo.
 * Evita que el sidebar se vea vacío en el primer render (el menú depende
 * del rol, que solo se conoce una vez que la sesión de NextAuth resuelve).
 */
function NavMainSkeleton() {
	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					{NAV_SKELETON_WIDTHS.map((width, i) => (
						<SidebarMenuItem key={i}>
							<SidebarMenuSkeleton showIcon width={width} />
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
