'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
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
import { UserWithRole } from '../types/business.types'

export interface AgentAutocompleteProps {
	value?: string
	onChange?: (value: string) => void
	agents?: UserWithRole[]
	placeholder?: string
	className?: string
	'aria-label'?: string
	'aria-labelledby'?: string
	disabled?: boolean
	onSearch?: (query: string) => Promise<UserWithRole[]>
}

export function AgentAutocomplete({
	value = '',
	onChange,
	agents = [],
	placeholder = 'Buscar agente...',
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	disabled = false,
	onSearch,
}: AgentAutocompleteProps) {
	const [open, setOpen] = React.useState(false)
	const [searchQuery, setSearchQuery] = React.useState('')
	const [remoteAgents, setRemoteAgents] = React.useState<UserWithRole[]>(agents)
	const [isSearching, setIsSearching] = React.useState(false)
	const hasRemoteSearch = typeof onSearch === 'function'

	React.useEffect(() => {
		setRemoteAgents(agents)
	}, [agents])

	// Búsqueda remota con debouncing
	React.useEffect(() => {
		if (!hasRemoteSearch) return

		if (!searchQuery || searchQuery.length < 3) {
			setRemoteAgents([])
			setIsSearching(false)
			return
		}

		setIsSearching(true)
		const controller = new AbortController()
		const handler = setTimeout(async () => {
			try {
				const results = await onSearch(searchQuery)
				if (!controller.signal.aborted) {
					setRemoteAgents(results)
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error('Error searching agents:', error)
					setRemoteAgents([])
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

	// Filtrar agentes basados en la búsqueda (local o remota)
	const filteredAgents = React.useMemo(() => {
		const agentsToFilter = hasRemoteSearch ? remoteAgents : agents

		if (!searchQuery) return agentsToFilter

		const query = searchQuery.toLowerCase()
		return agentsToFilter.filter((agent) => {
			const fullName = `${agent.name} ${agent.lastName || ''}`
				.trim()
				.toLowerCase()
			return (
				fullName.includes(query) ||
				agent.name.toLowerCase().includes(query) ||
				agent.lastName?.toLowerCase().includes(query) ||
				agent.identityNumber?.toLowerCase().includes(query) ||
				agent.email?.toLowerCase().includes(query)
			)
		})
	}, [agents, remoteAgents, searchQuery, hasRemoteSearch])

	// Encontrar el agente seleccionado en todas las fuentes disponibles
	const selectedAgent = React.useMemo(() => {
		// Combinar todas las fuentes de agentes disponibles
		const allAgents = hasRemoteSearch ? [...agents, ...remoteAgents] : agents

		// Buscar el agente por ID
		return allAgents.find((agent) => agent.idUser.toString() === value)
	}, [value, agents, remoteAgents, hasRemoteSearch])

	// Obtener nombre completo del agente
	const getFullName = (agent: UserWithRole) => {
		return `${agent.name} ${agent.lastName || ''}`.trim()
	}

	const handleSelect = (selectedValue: string) => {
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
					disabled={disabled}
					className={cn(
						'w-full justify-between h-auto min-h-10 py-2',
						!value && 'text-muted-foreground',
						className
					)}
				>
					{value ? (
						selectedAgent ? (
							<div className="flex items-center gap-2">
								<span className="font-medium">
									{getFullName(selectedAgent)}
								</span>
								{selectedAgent.identityNumber && (
									<span className="text-xs text-muted-foreground">
										- {selectedAgent.identityNumber}
									</span>
								)}
							</div>
						) : (
							<span className="text-muted-foreground">
								Agente no encontrado
							</span>
						)
					) : (
						<span>{placeholder}</span>
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={
							hasRemoteSearch
								? 'Buscar agente por nombre, apellido o cédula...'
								: 'Buscar agente por nombre, apellido o cédula...'
						}
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList>
						{isSearching && <CommandEmpty>Buscando agentes...</CommandEmpty>}
						{!isSearching && (
							<CommandEmpty>
								{searchQuery.length >= 3
									? 'No se encontraron agentes'
									: hasRemoteSearch
										? 'Ingrese al menos 3 caracteres para buscar'
										: 'Ingrese al menos 1 carácter para buscar'}
							</CommandEmpty>
						)}

						{filteredAgents.length > 0 && (
							<CommandGroup heading="Agentes">
								{filteredAgents.map((agent) => (
									<CommandItem
										key={agent.idUser.toString()}
										value={agent.idUser.toString()}
										onSelect={() => handleSelect(agent.idUser.toString())}
									>
										<Check
											className={cn(
												'mr-2 h-4 w-4',
												value === agent.idUser.toString()
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
										<div className="flex items-center gap-2">
											<span className="font-medium">{getFullName(agent)}</span>
											{agent.identityNumber && (
												<span className="text-xs text-muted-foreground">
													- {agent.identityNumber}
												</span>
											)}
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
