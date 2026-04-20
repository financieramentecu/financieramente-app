'use client'

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
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
	useSidebar,
} from '@/features/shared/ui/sidebar'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'

export interface NavItem {
	title: string
	url: string
	icon?: React.ReactNode
	subItems?: NavItem[]
}

function NavSubMenuLink({
	subItem,
	isActive,
}: {
	subItem: NavItem
	isActive: boolean
}) {
	const labelRef = useRef<HTMLSpanElement>(null)
	const [truncated, setTruncated] = useState(false)
	const { state, isMobile } = useSidebar()

	const measure = useCallback(() => {
		const el = labelRef.current
		if (!el) {
			setTruncated(false)
			return
		}
		setTruncated(el.scrollWidth > el.clientWidth)
	}, [])

	useLayoutEffect(() => {
		const el = labelRef.current
		if (!el) return
		measure()
		const ro = new ResizeObserver(() => measure())
		ro.observe(el)
		return () => ro.disconnect()
	}, [measure, subItem.title])

	const showOverflowTooltip =
		!isMobile && state === 'expanded' && truncated

	const link = (
		<SidebarMenuSubButton asChild isActive={isActive}>
			<Link href={subItem.url}>
				{subItem.icon}
				<span ref={labelRef} className="min-w-0 flex-1 truncate">
					{subItem.title}
				</span>
			</Link>
		</SidebarMenuSubButton>
	)

	if (!showOverflowTooltip) {
		return link
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>{link}</TooltipTrigger>
			<TooltipContent side="right" align="center" className="max-w-xs">
				{subItem.title}
			</TooltipContent>
		</Tooltip>
	)
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
						// Para items sin subitems, solo activar si la ruta coincide exactamente
						// Para items con subitems, activar si la ruta coincide exactamente o si algún subitem está activo
						const hasSubItems = item.subItems && item.subItems.length > 0
						const hasActiveSubItem = hasSubItems
							? item.subItems!.some((subItem) => pathname === subItem.url)
							: false
						const isActive = hasSubItems
							? pathname === item.url || hasActiveSubItem
							: pathname === item.url
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
										<span className="min-w-0 flex-1 truncate">
											{item.title}
										</span>
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
											<span className="min-w-0 flex-1 truncate">
												{item.title}
											</span>
										</Link>
									</SidebarMenuButton>
								)}
								{hasSubItems && isOpen && (
									<SidebarMenuSub>
										{item.subItems!.map((subItem) => {
											const isSubActive = pathname === subItem.url
											return (
												<SidebarMenuSubItem key={subItem.title}>
													<NavSubMenuLink
														subItem={subItem}
														isActive={isSubActive}
													/>
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
