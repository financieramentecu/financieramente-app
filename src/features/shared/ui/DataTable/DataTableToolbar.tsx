import { ColumnFiltersState, Table } from '@tanstack/react-table'
import { Search, X, Download } from 'lucide-react'

import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { DataTableViewOptions } from './DataTableViewOptions'
import { useEffect, useState } from 'react'

interface DataTableToolbarProps<TData> {
	table: Table<TData>
	setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
	globalFilter: string
	setGlobalFilter: React.Dispatch<React.SetStateAction<string>>
	searchable?: boolean
	searchColumn?: string
	searchDebounceMs?: number
	exportable?: boolean
	onExport?: () => void
	onGlobalSearch?: (query: string) => void
	searchPlaceholder?: string
	renderAdditionalFilters?: () => React.ReactNode
}

export function DataTableToolbar<TData>({
	table,
	setColumnFilters,
	globalFilter,
	setGlobalFilter,
	searchable = true,
	searchColumn,
	searchDebounceMs = 0,
	exportable = false,
	onExport,
	onGlobalSearch,
	searchPlaceholder,
	renderAdditionalFilters,
}: DataTableToolbarProps<TData>) {
	const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter
	const [searchValue, setSearchValue] = useState<string>(globalFilter || '')

	// Debounce search
	useEffect(() => {
		const update = () => {
			if (onGlobalSearch) {
				onGlobalSearch(searchValue)
				return
			}
			
			if (searchColumn) {
				setColumnFilters(searchValue ? [{ id: searchColumn, value: searchValue }] : [])
			} else {
				setGlobalFilter(searchValue)
			}
		}

		if (searchDebounceMs === 0) {
			update()
			return
		}

		const handler = setTimeout(update, searchDebounceMs)

		return () => clearTimeout(handler)
	}, [searchValue, searchColumn, searchDebounceMs, onGlobalSearch, setColumnFilters, setGlobalFilter])

	const handleSearchChange = (newValue: string) => {
		setSearchValue(newValue)
		if (searchDebounceMs === 0) {
			if (onGlobalSearch) {
				onGlobalSearch(newValue)
			} else if (searchColumn) {
				setColumnFilters(newValue ? [{ id: searchColumn, value: newValue }] : [])
			} else {
				setGlobalFilter(newValue)
			}
		}
	}

	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-1 items-center space-x-2">
				{searchable && (
					<div className="relative">
						<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={searchPlaceholder ?? 'Buscar...'}
							value={searchValue}
							onChange={(event) => handleSearchChange(event.target.value)}
							className="h-8 w-[150px] pl-8 lg:w-[250px]"
						/>
					</div>
				)}
				{renderAdditionalFilters && renderAdditionalFilters()}
				{isFiltered && (
					<Button
						variant="ghost"
						onClick={() => table.resetColumnFilters()}
						className="h-8 px-2 lg:px-3"
					>
						Limpiar
						<X className="ml-2 h-4 w-4" />
					</Button>
				)}
			</div>
			<div className="flex items-center space-x-2">
				{exportable && (
					<Button
						variant="outline"
						size="sm"
						className="h-8 flex"
						onClick={onExport}
					>
						<Download className="mr-2 h-4 w-4" />
						Exportar
					</Button>
				)}
				<DataTableViewOptions table={table} />
			</div>
		</div>
	)
}
