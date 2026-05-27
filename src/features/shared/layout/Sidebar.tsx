'use client'

import * as React from 'react'
import { NavMain } from '../layout/nav-main'
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/features/shared/ui/sidebar'

import Image from 'next/image'
import { useSidebar } from '@/features/shared/ui/sidebar'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { buildMenuByRole } from '@/lib/navigation/menu-builder'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { state } = useSidebar()
	const { session } = useAuthSession()
	const isCollapsed = state === 'collapsed'
	const { enabled: isDashboardEnabled } = useFeatureFlag('production_dashboard')

	// Construir menú dinámico según rol y permisos
	const menuItems = React.useMemo(() => {
		if (!session?.user) {
			return []
		}
		const items = buildMenuByRole(session.user.role, session.user.permissions)
		if (!isDashboardEnabled) {
			return items.filter((item) => item.url !== '/dashboard')
		}
		return items
	}, [session, isDashboardEnabled])



	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:p-0! sidebar-button w-full h-24"
						>
							<a
								href="#"
								className="w-full h-full flex items-center justify-center"
							>
								<Image
									src={
										isCollapsed
											? '/logos/isologo-verde.svg'
											: '/logos/logo-verde.svg'
									}
									alt="Financieramente"
									width={isCollapsed ? 60 : 150}
									height={isCollapsed ? 60 : 80}
									className={
										isCollapsed
											? 'size-16'
											: 'w-full h-auto max-h-20 object-contain'
									}
								/>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={menuItems} />
			</SidebarContent>

		</Sidebar>
	)
}
