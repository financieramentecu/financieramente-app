'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/features/shared/ui/button'
import { Separator } from '@/features/shared/ui/separator'
import { SidebarTrigger } from '@/features/shared/ui/sidebar'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/features/shared/ui/breadcrumb'
import { User, Mail, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/features/shared/ui/theme-toggle'

export interface BreadcrumbItemProps {
	label: string
	href?: string
}

interface SiteHeaderProps {
	title?: string
	breadcrumbs?: BreadcrumbItemProps[]
}

export function SiteHeader({ title = 'Financieramente', breadcrumbs = [] }: SiteHeaderProps) {
	const { user } = useAuthSession()

	const userInitials =
		user?.name
			?.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || 'U'

	return (
		<header className="flex shrink-0 flex-col border-b">
			<div className="flex h-16 w-full items-center gap-1 px-4 py-2 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 data-[orientation=vertical]:h-4"
				/>
				<h1 className="text-base font-medium">{title}</h1>
				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					{user && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="hidden sm:flex gap-2"
								>
									<div className="flex flex-col items-end">
										<span className="text-sm font-medium">{user.name || user.email}</span>
										<span className="text-xs text-muted-foreground">
											{user.role || 'Sin rol'}
										</span>
									</div>
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={user.image || undefined}
											alt={user.name || ''}
										/>
										<AvatarFallback>{userInitials}</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-medium leading-none">
											{user.name}
										</p>
										<p className="text-xs leading-none text-muted-foreground">
											{user.role || 'Sin rol'}
										</p>
										<p className="text-xs leading-none text-muted-foreground flex items-center gap-1 truncate">
											<Mail className="h-3 w-3 shrink-0" />
											<span className="truncate">{user.email}</span>
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<User className="mr-2 h-4 w-4" />
									<span>Perfil</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={async () => {
										const { signOut } = await import('next-auth/react')
										await signOut({ callbackUrl: '/login', redirect: true })
									}}
									className="cursor-pointer"
								>
									<LogOut className="mr-2 h-4 w-4" />
									<span>Cerrar Sesión</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>
			{breadcrumbs.length > 0 && (
				<div className="border-t bg-muted/30 px-4 py-2.5 lg:px-6">
					<Breadcrumb>
						<BreadcrumbList>
							{breadcrumbs.map((crumb, index) => (
								<React.Fragment key={index}>
									{index > 0 && <BreadcrumbSeparator />}
									<BreadcrumbItem>
										{crumb.href ? (
											<BreadcrumbLink asChild>
												<Link href={crumb.href}>{crumb.label}</Link>
											</BreadcrumbLink>
										) : (
											<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
										)}
									</BreadcrumbItem>
								</React.Fragment>
							))}
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			)}
		</header>
	)
}
