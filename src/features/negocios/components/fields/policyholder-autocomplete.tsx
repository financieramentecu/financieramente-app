'use client'

import { useEffect, useState } from 'react'
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
import type { PolicyholderSearchResult } from '@/features/policyholders/types/policyholder.types'

export interface PolicyholderAutocompleteProps {
	value?: string
	results: PolicyholderSearchResult[]
	isSearching: boolean
	disabled?: boolean
	onQueryChange: (query: string) => void
	onSelect: (policyholder: PolicyholderSearchResult) => void
	onCreateNew: (identityNumber: string) => void
}

export function PolicyholderAutocomplete({
	value = '',
	results,
	isSearching,
	disabled = false,
	onQueryChange,
	onSelect,
	onCreateNew,
}: PolicyholderAutocompleteProps) {
	const [open, setOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	useEffect(() => {
		if (open && value) {
			setSearchQuery(value)
		}
	}, [open, value])

	useEffect(() => {
		onQueryChange(searchQuery)
	}, [searchQuery, onQueryChange])

	const exactMatch = results.some(
		(row) => row.identityNumber.toLowerCase() === searchQuery.trim().toLowerCase()
	)
	const showCreate = searchQuery.trim().length >= 3 && !exactMatch && !isSearching

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-labelledby="policyholderIdentityNumber-label"
					disabled={disabled}
					className={cn('w-full justify-between', !value && 'text-muted-foreground')}
				>
					{value || 'Buscar tomador por documento...'}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Buscar tomador por documento..."
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList>
						<CommandEmpty>
							{isSearching
								? 'Buscando tomadores...'
								: searchQuery.trim().length >= 3
									? 'No se encontraron tomadores'
									: 'Ingrese al menos 3 caracteres para buscar'}
						</CommandEmpty>
						{showCreate && (
							<CommandGroup>
								<CommandItem
									value="__create_new__"
									onSelect={() => {
										onCreateNew(searchQuery.trim().toUpperCase())
										setOpen(false)
									}}
									className="text-primary"
								>
									<Plus className="mr-2 h-4 w-4" />
									Crear nuevo tomador: {searchQuery.trim()}
								</CommandItem>
							</CommandGroup>
						)}
						{results.length > 0 && (
							<CommandGroup heading="Tomadores existentes">
								{results.map((row) => (
									<CommandItem
										key={row.idPolicyholder}
										value={row.identityNumber}
										onSelect={() => {
											onSelect(row)
											setOpen(false)
											setSearchQuery('')
										}}
									>
										<Check
											className={cn(
												'mr-2 h-4 w-4',
												value === row.identityNumber
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
										<div className="flex flex-col">
											<span className="font-medium">{row.identityNumber}</span>
											<span className="text-xs text-muted-foreground">
												{row.name} {row.lastName}
												{row.email ? ` - ${row.email}` : ''}
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
