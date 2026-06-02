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
import { HeaderImpersonationSelect } from './HeaderImpersonationSelect'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'

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
	const { enabled: impersonationEnabled } = useFeatureFlag('impersonation_select')

	const userInitials =
		user?.name
			?.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || 'U'

	return (
		<header className="flex shrink-0 flex-col border-b">
			<div className="flex h-16 w-full items-center gap-1 px-4 py-2 lg:gap-2 lg:px-6 min-w-0">
				<SidebarTrigger className="-ml-1 shrink-0" aria-label="Abrir menú" />
				<Separator
					orientation="vertical"
					className="mx-2 shrink-0 data-[orientation=vertical]:h-4 hidden sm:block"
				/>
				<h1 className="text-base font-medium truncate min-w-0 flex-1">{title}</h1>
				<div className="ml-auto flex items-center gap-2">
					{impersonationEnabled && (
						<div className="hidden sm:block">
							<HeaderImpersonationSelect />
						</div>
					)}
					<ThemeToggle className="h-9 w-9 rounded-lg border-[#11525B]/40 px-0 text-[#11525B] hover:bg-[#11525B]/10 hover:text-[#11525B]" />
					{user && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="h-10 rounded-lg border border-[#11525B]/40 bg-[#11525B]/8 px-2 text-[#11525B] hover:bg-[#11525B]/15 hover:text-[#11525B] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:gap-2 sm:px-3"
									aria-label="Menú de usuario"
								>
									<div className="hidden sm:flex flex-col items-end">
										<span className="text-sm font-semibold leading-tight">
											{user.name || user.email}
										</span>
										<span className="text-[11px] uppercase tracking-wide text-[#11525B]/90">
											{user.role || 'Sin rol'}
										</span>
									</div>
									<Avatar className="h-8 w-8 shrink-0">
										<AvatarImage
											src={user.image || undefined}
											alt={user.name || ''}
										/>
										<AvatarFallback className="bg-[#11525B]/18 text-[#11525B] ring-1 ring-[#11525B]/35 text-[11px] font-semibold">
											{userInitials}
										</AvatarFallback>
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
