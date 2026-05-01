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
import {
	Avatar,
	AvatarFallback,
} from '@/features/shared/ui/avatar'
import { UserWithRole } from '../../types/business.types'

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
	placeholder = 'Buscar Money Strategist...',
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	disabled = false,
	onSearch,
}: AgentAutocompleteProps) {
	const [open, setOpen] = React.useState(false)
	const [searchQuery, setSearchQuery] = React.useState('')
	const [remoteAgents, setRemoteAgents] = React.useState<UserWithRole[]>([])
	const [isSearching, setIsSearching] = React.useState(false)
	const [selectedAgentCache, setSelectedAgentCache] = React.useState<
		UserWithRole[]
	>([])
	const hasRemoteSearch = typeof onSearch === 'function'

	// Initialize cache from agents prop (e.g., in edit mode or when user is agent)
	React.useEffect(() => {
		if (agents.length > 0) {
			setSelectedAgentCache((prev) => {
				// Merge agents from props into cache, avoiding duplicates
				const newAgents = agents.filter(
					(agent) => !prev.some((cached) => cached.idUser === agent.idUser)
				)
				return [...prev, ...newAgents]
			})
		}
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

	// Filtrar Money Strategist basados en la búsqueda (local o remota)
	const filteredAgents = React.useMemo(() => {
		const agentsToFilter = hasRemoteSearch
			? [...remoteAgents, ...selectedAgentCache]
			: [...agents, ...selectedAgentCache]

		// Remove duplicates based on idUser
		const uniqueAgents = agentsToFilter.filter(
			(agent, index, self) =>
				index === self.findIndex((a) => a.idUser === agent.idUser)
		)

		if (!searchQuery) return uniqueAgents

		const query = searchQuery.toLowerCase()
		return uniqueAgents.filter((agent) => {
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
	}, [agents, remoteAgents, selectedAgentCache, searchQuery, hasRemoteSearch])

	// Sync cache with value prop changes
	React.useEffect(() => {
		if (!value) {
			// Don't clear cache when value is cleared, as it might be needed for display
			return
		}

		// If value exists, ensure the agent is in cache
		const allAgents = [...agents, ...remoteAgents]
		const agent = allAgents.find((a) => a.idUser.toString() === value)

		if (agent) {
			setSelectedAgentCache((prev) => {
				const exists = prev.some((a) => a.idUser.toString() === value)
				return exists ? prev : [...prev, agent]
			})
		}
	}, [value, agents, remoteAgents])

	// Encontrar el Money Strategist seleccionado en todas las fuentes disponibles
	const selectedAgent = React.useMemo(() => {
		if (!value) return undefined

		// Search in all sources: agents prop, remoteAgents, and cache
		const allAgents = [...agents, ...remoteAgents, ...selectedAgentCache]
		return allAgents.find((agent) => agent.idUser.toString() === value)
	}, [value, agents, remoteAgents, selectedAgentCache])

	// Obtener nombre completo del Money Strategist
	const getFullName = (agent: UserWithRole) => {
		return `${agent.name} ${agent.lastName || ''}`.trim()
	}

	const handleSelect = (selectedValue: string) => {
		// Find the selected agent and add to cache
		const allAgents = [...agents, ...remoteAgents]
		const selected = allAgents.find(
			(agent) => agent.idUser.toString() === selectedValue
		)

		if (selected) {
			setSelectedAgentCache((prev) => {
				// Avoid duplicates
				const exists = prev.some(
					(agent) => agent.idUser.toString() === selectedValue
				)
				return exists ? prev : [...prev, selected]
			})
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
					disabled={disabled}
					className={cn(
						'w-full justify-between h-auto min-h-10 py-2',
						!value && 'text-muted-foreground',
						className
					)}
				>
					{value ? (
						selectedAgent ? (
							<div className="flex items-center gap-3 py-1">
								<Avatar className="h-8 w-8 border border-border shadow-sm">
									<AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
										{selectedAgent.name[0]}
										{selectedAgent.lastName?.[0]}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col items-start">
									<span className="font-semibold text-sm">
										{getFullName(selectedAgent)}
									</span>
									{selectedAgent.identityNumber && (
										<span className="text-[10px] text-muted-foreground uppercase tracking-tight">
											Documento: {selectedAgent.identityNumber}
										</span>
									)}
								</div>
							</div>
						) : (
							<span className="text-muted-foreground">
								Money Strategist no encontrado
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
								? 'Buscar Money Strategist por nombre, apellido o cédula...'
								: 'Buscar Money Strategist por nombre, apellido o cédula...'
						}
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList>
						{isSearching && <CommandEmpty>Buscando Money Strategist...</CommandEmpty>}
						{!isSearching && (
							<CommandEmpty>
								{searchQuery.length >= 3
									? 'No se encontraron Money Strategists'
									: hasRemoteSearch
										? 'Ingrese al menos 3 caracteres para buscar'
										: 'Ingrese al menos 1 carácter para buscar'}
							</CommandEmpty>
						)}

						{filteredAgents.length > 0 && (
							<CommandGroup heading="Money Strategists">
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
