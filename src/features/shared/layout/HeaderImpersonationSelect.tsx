'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/features/shared/ui/command'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/features/shared/ui/popover'
import { Button } from '@/features/shared/ui/button'
import { UserRole } from '@/features/auth/lib/roles'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { UserWithRole } from '@/features/negocios/types/business.types'
import { toast } from 'sonner'
import { Loader2, ChevronsUpDown, X } from 'lucide-react'

export function HeaderImpersonationSelect() {
	const { data: session, update } = useSession()
	const [users, setUsers] = useState<UserWithRole[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [open, setOpen] = useState(false)

	// Solo administradores o admins suplantando a otros ven este selector
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const user = session?.user as any
	const isAdmin = user?.role === UserRole.ADMIN || user?.originalRole === UserRole.ADMIN
	
	const userId = user?.id
	const originalUserId = user?.originalUserId
	
	useEffect(() => {
		if (isAdmin) {
			let isMounted = true
			const fetchUsers = async () => {
				setIsLoading(true)
				try {
					// Obtenemos todos los usuarios activos
					const params = new URLSearchParams({ status: 'true', forImpersonation: 'true', limit: '100' })
					const res = await apiClient.get<ApiResponse<UserWithRole[]>>(`/users/search?${params.toString()}`)
					if (isMounted && res.data) {
						// Filtramos al propio admin para que no se vea a sí mismo en la lista
						const currentOriginalId = user?.originalUserId || user?.id
						const filtered = res.data.filter(u => u.idUser.toString() !== currentOriginalId?.toString() && u.role?.code !== UserRole.ADMIN)
						setUsers(filtered)
					}
				} catch (error) {
					console.error('Error fetching users for impersonation:', error)
				} finally {
					if (isMounted) setIsLoading(false)
				}
			}
			fetchUsers()
			
			return () => { isMounted = false }
		}
	}, [isAdmin, userId, originalUserId])

	if (!isAdmin) return null

	const handleImpersonate = async (targetId: string) => {
		try {
			if (targetId === 'STOP') {
				await update({ impersonateUserId: 'STOP' })
				window.location.href = '/dashboard'
				return
			}
			
			await update({ impersonateUserId: targetId })
			toast.success('Sesión suplantada correctamente')
			window.location.href = '/dashboard'
		} catch {
			toast.error('Error al suplantar usuario')
		}
	}

	const currentUserName = user?.originalUserId && users.length > 0 
		? users.find(u => u.idUser.toString() === user?.id?.toString())?.name 
		: undefined

	return (
		<div className="flex items-center gap-2 max-w-[250px]">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-[200px] justify-between h-8 text-xs bg-muted/50 border-orange-200 text-orange-700 font-medium hover:bg-orange-50 transition-colors"
					>
						{isLoading ? (
							<div className="flex items-center gap-2">
								<Loader2 className="h-3 w-3 animate-spin" />
								<span>Cargando...</span>
							</div>
						) : (
							<span className="truncate">
								{currentUserName ? `Ver como ${currentUserName}...` : "Ver como..."}
							</span>
						)}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[300px] p-0">
					<Command>
						<CommandInput placeholder="Buscar por nombre o apellido..." className="h-9 text-xs" />
						<CommandList className="max-h-[300px]">
							<CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
								No se encontraron usuarios.
							</CommandEmpty>
							<CommandGroup>
								{user?.originalUserId && (
									<CommandItem
										value="STOP"
										onSelect={() => {
											handleImpersonate('STOP')
											setOpen(false)
										}}
										className="text-xs text-red-600 font-semibold cursor-pointer mb-1 focus:bg-red-50 focus:text-red-700"
									>
										<X className="mr-2 h-4 w-4 text-red-600" />
										Dejar de suplantar
									</CommandItem>
								)}
								{users.map(u => (
									<CommandItem
										key={u.idUser}
										value={`${u.name} ${u.lastName} ${u.idUser} ${u.role?.name || ''}`}
										onSelect={() => {
											handleImpersonate(u.idUser.toString())
											setOpen(false)
										}}
										className="text-xs cursor-pointer"
									>
										<span>{u.name} {u.lastName}</span>
										<span className="text-[10px] text-muted-foreground ml-1">({u.role?.name})</span>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	)
}
