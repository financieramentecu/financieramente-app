'use client'

import React, { useState } from 'react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/features/shared/ui/table'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import { Skeleton } from '@/features/shared/ui/skeleton'
import {
	DataTableProps,
	DataTableColumn,
} from '@/features/shared/ui/types/dashboard.types'
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export function DataTable<T extends Record<string, unknown>>({
	columns,
	data,
	pagination,
	onRowAction: _onRowAction,
	searchable = false,
	onGlobalSearch,
	loading = false,
	searchPlaceholder = '',
	renderAdditionalFilters,
}: DataTableProps<T>) {
	const [searchQuery, setSearchQuery] = useState('')

	const handleSearch = (query: string) => {
		setSearchQuery(query)
		onGlobalSearch?.(query)
	}

	const renderCell = (column: DataTableColumn<T>, row: T): React.ReactNode => {
		if (column.cellRenderer) {
			return column.cellRenderer(row[column.key], row)
		}
		return String(row[column.key])
	}

	return (
		<div className="space-y-4">
			{/* Search Bar and Additional Filters */}
			{(searchable || renderAdditionalFilters) && (
				<div className="flex items-center gap-4 flex-wrap">
					{searchable && (
						<div className="relative flex-1 max-w-lg">
							<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder={searchPlaceholder}
								value={searchQuery}
								onChange={(e) => handleSearch(e.target.value)}
								className="pl-8 pr-8"
							/>
							{loading && (
								<Loader2 className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
							)}
						</div>
					)}
					{renderAdditionalFilters && renderAdditionalFilters()}
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((column) => (
								<TableHead key={String(column.key)}>{column.header}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							// Skeleton loading rows
							Array.from({ length: 5 }).map((_, rowIndex) => (
								<TableRow
									key={`skeleton-${rowIndex}`}
									className="animate-pulse"
								>
									{columns.map((column) => (
										<TableCell key={String(column.key)}>
											<Skeleton className="h-4 w-full max-w-[120px]" />
										</TableCell>
									))}
								</TableRow>
							))
						) : data.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No se encontraron datos
								</TableCell>
							</TableRow>
						) : (
							data.map((row, index) => (
								<TableRow key={index}>
									{columns.map((column) => (
										<TableCell key={String(column.key)}>
											{renderCell(column, row)}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{pagination && (
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						Mostrando {(pagination.currentPage - 1) * pagination.pageSize + 1} a{' '}
						{Math.min(
							pagination.currentPage * pagination.pageSize,
							pagination.totalItems
						)}{' '}
						de {pagination.totalItems} resultados
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								pagination.onPageChange(pagination.currentPage - 1)
							}
							disabled={pagination.currentPage <= 1}
						>
							<ChevronLeft className="h-4 w-4" />
							Anterior
						</Button>
						<span className="text-sm">
							Página {pagination.currentPage} de{' '}
							{Math.ceil(pagination.totalItems / pagination.pageSize)}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								pagination.onPageChange(pagination.currentPage + 1)
							}
							disabled={
								pagination.currentPage >=
								Math.ceil(pagination.totalItems / pagination.pageSize)
							}
						>
							Siguiente
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
