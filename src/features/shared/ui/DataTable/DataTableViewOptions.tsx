import { Table } from '@tanstack/react-table'
import { Settings2 } from 'lucide-react'

import { Button } from '@/features/shared/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'

interface DataTableViewOptionsProps<TData> {
	table: Table<TData>
	columnLabels?: Record<string, string>
}

export function DataTableViewOptions<TData>({
	table,
	columnLabels,
}: DataTableViewOptionsProps<TData>) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="ml-auto hidden h-9 lg:flex"
				>
					<Settings2 className="mr-2 h-4 w-4" />
					Vista
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[200px]">
				<DropdownMenuLabel>Columnas</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{table
					.getAllColumns()
					.filter(
						(column) =>
							typeof column.accessorFn !== 'undefined' && column.getCanHide()
					)
					.map((column) => {
						const isFriendly = !!columnLabels?.[column.id] || typeof column.columnDef.header === 'string'
						const label = columnLabels?.[column.id] || (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id)

						return (
							<DropdownMenuCheckboxItem
								key={column.id}
								className={isFriendly ? '' : 'capitalize'}
								checked={column.getIsVisible()}
								onCheckedChange={(value) => column.toggleVisibility(!!value)}
							>
								{label}
							</DropdownMenuCheckboxItem>
						)
					})}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
