'use client'

import React from 'react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface CrudTableColumn<T> {
	key: keyof T | string
	header: string
	cellRenderer?: (value: unknown, row: T) => React.ReactNode
	className?: string
}

export interface CrudTableProps<T> {
	data: T[]
	columns: CrudTableColumn<T>[]
	onEdit: (item: T) => void
	onDelete: (item: T) => void
	isLoading?: boolean
	searchable?: boolean
	onSearch?: (query: string) => void
	searchPlaceholder?: string
	emptyMessage?: string
}

export function CrudTable<T extends Record<string, unknown>>({
	data,
	columns,
	onEdit,
	onDelete,
	isLoading = false,
	searchable = true,
	onSearch,
	searchPlaceholder = 'Buscar...',
	emptyMessage = 'No hay datos disponibles',
}: CrudTableProps<T>) {
	const [searchQuery, setSearchQuery] = React.useState('')

	const handleSearch = (query: string) => {
		setSearchQuery(query)
		onSearch?.(query)
	}

	const renderCell = (column: CrudTableColumn<T>, row: T): React.ReactNode => {
		if (column.cellRenderer) {
			return column.cellRenderer(row[column.key as keyof T], row)
		}
		const value = row[column.key as keyof T]
		if (value === null || value === undefined) {
			return <span className="text-muted-foreground">-</span>
		}
		if (typeof value === 'boolean') {
			return (
				<Badge variant={value ? 'default' : 'secondary'}>
					{value ? 'Activo' : 'Inactivo'}
				</Badge>
			)
		}
		return String(value)
	}

	return (
		<div className="space-y-4">
			{/* Search Bar */}
			{searchable && (
				<div className="flex items-center space-x-2">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={searchPlaceholder}
							value={searchQuery}
							onChange={(e) => handleSearch(e.target.value)}
							className="pl-8"
						/>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((column) => (
								<TableHead
									key={String(column.key)}
									className={column.className}
								>
									{column.header}
								</TableHead>
							))}
							<TableHead className="w-[120px] text-right">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={columns.length + 1}
									className="text-center py-8"
								>
									<p className="text-muted-foreground">Cargando...</p>
								</TableCell>
							</TableRow>
						) : data.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length + 1}
									className="text-center py-8"
								>
									<p className="text-muted-foreground">{emptyMessage}</p>
								</TableCell>
							</TableRow>
						) : (
							data.map((row, index) => (
								<TableRow key={index}>
									{columns.map((column) => (
										<TableCell
											key={String(column.key)}
											className={column.className}
										>
											{renderCell(column, row)}
										</TableCell>
									))}
									<TableCell className="text-right">
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onEdit(row)}
												className="h-8 w-8 p-0"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onDelete(row)}
												className="h-8 w-8 p-0 text-destructive hover:text-destructive"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
