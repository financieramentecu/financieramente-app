import { Table } from '@tanstack/react-table'
import { Search, X, Download } from 'lucide-react'

import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { DataTableViewOptions } from './DataTableViewOptions'
import { useEffect, useState } from 'react'

interface DataTableToolbarProps<TData> {
	table: Table<TData>
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
	searchable = true,
	searchColumn,
	searchDebounceMs = 300,
	exportable = false,
	onExport,
	onGlobalSearch,
	searchPlaceholder,
	renderAdditionalFilters,
}: DataTableToolbarProps<TData>) {
	const isFiltered = table.getState().columnFilters.length > 0
	const [searchValue, setSearchValue] = useState<string>(
		(searchColumn ? table.getColumn(searchColumn)?.getFilterValue() as string : '') ?? ''
	)

	// Debounce search
	useEffect(() => {
		const handler = setTimeout(() => {
			if (onGlobalSearch) {
				onGlobalSearch(searchValue)
			} else if (searchColumn) {
				const column = table.getColumn(searchColumn)
				if (column) {
					column.setFilterValue(searchValue)
				}
			}
		}, searchDebounceMs)

		return () => clearTimeout(handler)
	}, [searchValue, searchColumn, table, searchDebounceMs, onGlobalSearch])

	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-1 items-center space-x-2">
				{searchable && (
					<div className="relative">
						<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={searchPlaceholder ?? `Filtrar por ${searchColumn ?? '...'}...`}
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
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
