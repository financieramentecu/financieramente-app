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

export interface ContractAutocompleteProps {
	value?: string
	onChange?: (value: string) => void
	onSelectLag?: (id: number | null) => void
	placeholder?: string
	className?: string
	disabled?: boolean
}

interface LagRecord {
	id: number
	contract: string
	value: number
	description: string | null
}

export function ContractAutocomplete({
	value = '',
	onChange,
	onSelectLag,
	placeholder = 'Buscar contrato rezagado...',
	className,
	disabled = false,
}: ContractAutocompleteProps) {
	const [open, setOpen] = React.useState(false)
	const [searchQuery, setSearchQuery] = React.useState('')
	const [records, setRecords] = React.useState<LagRecord[]>([])
	const [isSearching, setIsSearching] = React.useState(false)

	React.useEffect(() => {
		if (open && value) {
			setSearchQuery(value)
		}
	}, [open, value])

	React.useEffect(() => {
		if (!searchQuery || searchQuery.length < 3) {
			setRecords([])
			setIsSearching(false)
			return
		}

		setIsSearching(true)
		const controller = new AbortController()
		const handler = setTimeout(async () => {
			try {
				const response = await fetch(
					`/api/pre-liquidacion/rezagos/autocomplete?q=${encodeURIComponent(searchQuery)}`,
					{ signal: controller.signal }
				)
				const result = await response.json()
				if (!controller.signal.aborted) {
					setRecords(result.data || [])
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error('Error searching contracts:', error)
					setRecords([])
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
	}, [searchQuery])

	const handleSelect = (selectedRecord: LagRecord | null) => {
		if (onChange) {
			onChange(selectedRecord ? selectedRecord.contract : searchQuery)
		}
		if (onSelectLag) {
			onSelectLag(selectedRecord ? selectedRecord.id : null)
		}
		setOpen(false)
		setSearchQuery('')
	}

	// Determinar si mostrar la opción manual
	const shouldShowManual = React.useMemo(() => {
		if (!searchQuery || searchQuery.length < 1) return false
		const exists = records.some(
			(r) => r.contract.toLowerCase() === searchQuery.toLowerCase()
		)
		return !exists
	}, [searchQuery, records])

	return (
		<Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						'w-full justify-between',
						!value && 'text-muted-foreground',
						className
					)}
				>
					{value || placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Buscar por contrato..."
						value={searchQuery}
						onValueChange={setSearchQuery}
					/>
					<CommandList>
						<CommandEmpty>
							{isSearching
								? 'Buscando...'
								: searchQuery.length >= 3
									? 'No se encontraron contratos'
									: 'Ingrese al menos 3 caracteres'}
						</CommandEmpty>

						{shouldShowManual && !isSearching && (
							<CommandGroup>
								<CommandItem
									value="__manual__"
									onSelect={() => handleSelect(null)}
									className="text-primary cursor-pointer"
								>
									Usar contrato manual: {searchQuery}
								</CommandItem>
							</CommandGroup>
						)}

						{records.length > 0 && (
							<CommandGroup heading="Contratos Rezagados">
								{records.map((record) => (
									<CommandItem
										key={record.id}
										value={record.contract}
										onSelect={() => handleSelect(record)}
										className="cursor-pointer"
									>
										<Check
											className={cn(
												'mr-2 h-4 w-4',
												value === record.contract
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
										<div className="flex flex-col">
											<span className="font-medium">{record.contract}</span>
											<span className="text-xs text-muted-foreground">
												Valor: ${record.value} {record.description ? `- ${record.description}` : ''}
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
