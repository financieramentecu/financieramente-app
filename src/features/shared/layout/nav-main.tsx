'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
} from '@/features/shared/ui/sidebar'

export interface NavItem {
	title: string
	url: string
	icon?: React.ReactNode
	subItems?: NavItem[]
}

export function NavMain({ items }: { items: NavItem[] }) {
	const pathname = usePathname()
	const [openItems, setOpenItems] = useState<Set<string>>(new Set())

	// Abrir automáticamente el item si alguno de sus subitems está activo
	useEffect(() => {
		const newOpenItems = new Set<string>()
		items.forEach((item) => {
			if (item.subItems) {
				const hasActiveSubItem = item.subItems.some(
					(subItem) => pathname === subItem.url
				)
				if (hasActiveSubItem) {
					newOpenItems.add(item.title)
				}
			}
		})
		setOpenItems(newOpenItems)
	}, [pathname, items])

	const toggleItem = (itemTitle: string) => {
		setOpenItems((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(itemTitle)) {
				newSet.delete(itemTitle)
			} else {
				newSet.add(itemTitle)
			}
			return newSet
		})
	}

	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					{items.map((item) => {
						const isActive =
							pathname === item.url || pathname?.startsWith(item.url + '/')
						const hasSubItems = item.subItems && item.subItems.length > 0
						const isOpen = openItems.has(item.title)

						return (
							<SidebarMenuItem key={item.title}>
								{hasSubItems ? (
									<SidebarMenuButton
										tooltip={item.title}
										className={cn(
											isActive ? 'sidebar-button-active' : 'sidebar-button',
											'cursor-pointer group/accordion'
										)}
										onClick={(e) => {
											e.preventDefault()
											toggleItem(item.title)
										}}
									>
										{item.icon}
										<span className="flex-1">{item.title}</span>
										<ChevronRight
											className={cn(
												'ml-auto h-4 w-4 min-w-[1rem] transition-all duration-200',
												'text-sidebar-foreground/80 group-hover/accordion:text-sidebar-foreground',
												isOpen && 'rotate-90 text-sidebar-foreground'
											)}
										/>
									</SidebarMenuButton>
								) : (
									<SidebarMenuButton
										tooltip={item.title}
										asChild
										className={
											isActive ? 'sidebar-button-active' : 'sidebar-button'
										}
									>
										<Link href={item.url}>
											{item.icon}
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								)}
								{hasSubItems && isOpen && (
									<SidebarMenuSub>
										{item.subItems!.map((subItem) => {
											const isSubActive = pathname === subItem.url
											return (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton asChild isActive={isSubActive}>
														<Link href={subItem.url}>
															{subItem.icon}
															<span>{subItem.title}</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											)
										})}
									</SidebarMenuSub>
								)}
							</SidebarMenuItem>
						)
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
