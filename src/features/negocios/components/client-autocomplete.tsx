'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/features/shared/ui/button'
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
import { Client } from '@prisma/client'

export interface DocumentAutocompleteProps {
	value?: string
	onChange?: (value: string) => void
	users?: Client[]
	placeholder?: string
	onCreateNew?: (documento: string) => void
	onSearch?: (query: string) => Promise<Client[]>
	className?: string
	'aria-label'?: string
	'aria-labelledby'?: string
}

export function ClientAutocomplete({
	value = '',
	onChange,
	users = [],
	placeholder = 'Buscar o crear...',
	onCreateNew,
	onSearch,
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
}: DocumentAutocompleteProps) {
	const [open, setOpen] = React.useState(false)
	const [searchQuery, setSearchQuery] = React.useState('')
	const [remoteUsers, setRemoteUsers] = React.useState<Client[]>(users)
	const [isSearching, setIsSearching] = React.useState(false)
	const hasRemoteSearch = typeof onSearch === 'function'

	React.useEffect(() => {
		setRemoteUsers(users)
	}, [users])

	// Inicializar el searchQuery con el valor actual cuando se abre el popover
	React.useEffect(() => {
		if (open && value) {
			// Si el popover se abre y hay un valor, inicializar la búsqueda con ese valor
			// Esto permite que el usuario continúe desde donde estaba
			setSearchQuery(value)
		}
	}, [open, value])

	React.useEffect(() => {
		if (!hasRemoteSearch) return

		if (!searchQuery || searchQuery.length < 3) {
			setRemoteUsers([])
			setIsSearching(false)
			return
		}

		setIsSearching(true)
		const controller = new AbortController()
		const handler = setTimeout(async () => {
			try {
				const results = await onSearch(searchQuery)
				if (!controller.signal.aborted) {
					setRemoteUsers(results)
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error('Error searching users:', error)
					setRemoteUsers([])
				}
			} finally {
				if (!controller.signal.aborted) {
					setIsSearching(false)
				}
			}
		}, 400)

		return () => {
			controller.abort()
			clearTimeout(handler)
		}
	}, [searchQuery, onSearch, hasRemoteSearch])

	// Filtrar usuarios basados en la búsqueda
	const filteredUsers = React.useMemo(() => {
		if (hasRemoteSearch) {
			return remoteUsers
		}
		if (!searchQuery) return users

		const query = searchQuery.toLowerCase()
		return users.filter(
			(user) =>
				user.identityNumber.toLowerCase().includes(query) ||
				user.name.toLowerCase().includes(query) ||
				user.lastName?.toLowerCase().includes(query)
		)
	}, [users, remoteUsers, searchQuery, hasRemoteSearch])

	// Encontrar el usuario seleccionado
	const selectedUser = [...users, ...remoteUsers].find(
		(user) => user.identityNumber === value
	)

	// Determinar si se debe mostrar la opción de crear nuevo
	const shouldShowCreate = React.useMemo(() => {
		if (!searchQuery || searchQuery.length < 3) return false
		// Verificar si el documento ya existe
		const exists = [...users, ...remoteUsers].some(
			(user) => user.identityNumber.toLowerCase() === searchQuery.toLowerCase()
		)
		return !exists
	}, [searchQuery, users, remoteUsers])

	const handleSelect = (selectedValue: string) => {
		// Si es un valor de "create", llamar a onCreateNew y actualizar el valor
		if (selectedValue === '__create_new__' && onCreateNew) {
			// Cerrar el popover pero mantener el searchQuery para que el usuario pueda continuar buscando
			setOpen(false)
			// No limpiar searchQuery para que si el usuario vuelve a abrir, pueda continuar desde donde estaba

			// Actualizar el valor para que se refleje en el componente padre
			// Esto desbloqueará los campos del formulario
			if (onChange) {
				onChange(searchQuery)
			}

			// Luego llamar al callback para notificar la creación
			// Esto se ejecuta después de que el valor se haya actualizado
			onCreateNew(searchQuery)
			return
		}

		// Actualizar el valor seleccionado
		if (onChange) {
			onChange(selectedValue === value ? '' : selectedValue)
		}
		setOpen(false)
		setSearchQuery('')
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledBy}
					className={cn(
						'w-full justify-between',
						!value && 'text-muted-foreground',
						className
					)}
				>
					{value
						? selectedUser
							? `${selectedUser.identityNumber} - ${selectedUser.name} ${selectedUser.lastName}`
							: value // Mostrar el documento directamente si no hay usuario seleccionado (nuevo usuario)
						: placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Buscar cliente por CC, nombre o apellido..."
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList>
						<CommandEmpty>
							{isSearching
								? 'Buscando clientes...'
								: searchQuery.length >= 3
									? 'No se encontraron clientes'
									: 'Ingrese al menos 3 caracteres para buscar'}
						</CommandEmpty>

						{shouldShowCreate && searchQuery && !isSearching && (
							<CommandGroup>
								<CommandItem
									value="__create_new__"
									onSelect={() => handleSelect('__create_new__')}
									className="text-primary"
								>
									<Plus className="mr-2 h-4 w-4" />
									Crear nuevo cliente: {searchQuery}
								</CommandItem>
							</CommandGroup>
						)}

						{filteredUsers.length > 0 && (
							<CommandGroup heading="Clientes existentes">
								{filteredUsers.map((user) => (
									<CommandItem
										key={user.identityNumber}
										value={user.identityNumber}
										onSelect={() => handleSelect(user.identityNumber)}
									>
										<Check
											className={cn(
												'mr-2 h-4 w-4',
												value === user.identityNumber
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
										<div className="flex flex-col">
											<span className="font-medium">{user.identityNumber}</span>
											<span className="text-xs text-muted-foreground">
												{user.name} {user.lastName}
												{user.email && ` - ${user.email}`}
											</span>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
