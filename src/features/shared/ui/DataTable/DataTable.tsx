'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getExpandedRowModel,
	useReactTable,
	ExpandedState,
} from '@tanstack/react-table'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/features/shared/ui/table'
import { Checkbox } from '@/features/shared/ui/checkbox'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { cn } from '@/lib/utils'

import { DataTableProps } from './types'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import { exportToExcel } from './export-utils'

export function DataTable<TData>({
	columns,
	data,
	searchable = true,
	searchColumn,
	searchDebounceMs = 300,
	exportable = false,
	exportConfig,
	selectable = false,
	paginable = true,
	rowSelection: externalRowSelection,
	onRowSelectionChange: onExternalRowSelectionChange,
	onSelectionChange,
	onGlobalSearch,
	searchPlaceholder,
	manualPagination = false,
	totalItems,
	currentPage,
	pageSize: propPageSize,
	onPageChange,
	getRowId,
	enableRowSelection,
	selectedRowIds,
	actions,
	onRowClick,
	onExport,
	loading = false,

	emptyMessage = 'No se encontraron resultados.',
	pageSizeOptions = [10, 20, 50, 100],
	defaultPageSize = 10,
	renderSubComponent,
	getRowCanExpand,
	className,
	renderAdditionalFilters,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [internalRowSelection, setInternalRowSelection] = useState({})
	const [expanded, setExpanded] = useState<ExpandedState>({})

	// Sincronización de selección controlada/no-controlada
	const rowSelection = selectedRowIds ?? externalRowSelection ?? internalRowSelection
	const onRowSelectionChange = onExternalRowSelectionChange ?? setInternalRowSelection

	// Definición final de columnas (inyectando selección y acciones)
	const finalColumns = useMemo(() => {
		const cols = [...columns]

		// Inyectar columna de checkboxes si es selectable o enableRowSelection
		if (selectable || enableRowSelection) {
			cols.unshift({
				id: 'select',
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && 'indeterminate')
						}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						aria-label="Seleccionar todo"
						className="translate-y-[2px]"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Seleccionar fila"
						className="translate-y-[2px]"
					/>
				),
				enableSorting: false,
				enableHiding: false,
			})
		}

		// Inyectar columna de acciones si existe el prop
		if (actions) {
			cols.push({
				id: 'actions',
				cell: ({ row }) => (
					<div className="flex items-center justify-end">
						{actions(row.original)}
					</div>
				),
				enableSorting: false,
				enableHiding: false,
			})
		}

		return cols
	}, [columns, selectable, actions])

	const table = useReactTable({
		data,
		columns: finalColumns,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			expanded,
			...(manualPagination
				? {
						pagination: {
							pageIndex: (currentPage ?? 1) - 1,
							pageSize: propPageSize ?? defaultPageSize,
						},
					}
				: {}),
		},
		enableRowSelection: true,
		manualPagination,
		rowCount: manualPagination ? totalItems : undefined,
		onRowSelectionChange,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onExpandedChange: setExpanded,
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand,
		onPaginationChange: (updater) => {
			if (manualPagination && onPageChange) {
				const nextState =
					typeof updater === 'function'
						? updater({
								pageIndex: (currentPage ?? 1) - 1,
								pageSize: propPageSize ?? defaultPageSize,
							})
						: updater
				onPageChange(nextState.pageIndex + 1)
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId,
		initialState: {
			pagination: {
				pageSize: defaultPageSize,
			},
		},
	})

	// Efecto para emitir la selección simplificada
	useEffect(() => {
		if (onSelectionChange) {
			const selectedRows = table
				.getFilteredSelectedRowModel()
				.rows.map((row) => row.original)
			onSelectionChange(selectedRows)
		}
	}, [rowSelection, table, onSelectionChange])

	// Dummy export (to be improved with real column mapping if needed)
	const handleExport = () => {
		const rawData = table.getFilteredRowModel().rows.map((row) => row.original)

		if (onExport) {
			onExport(rawData)
			return
		}

		const exportData = exportConfig?.transformData
			? exportConfig.transformData(rawData)
			: rawData.map((row) => {
					// Eliminar campos que no queremos en el excel si es necesario
					return { ...row }
			  })

		exportToExcel(
			exportData,
			exportConfig?.fileName || 'exportacion-tabla',
			exportConfig?.sheetName
		)
	}


	return (
		<div className={cn('space-y-4', className)}>
			{(searchable || exportable || renderAdditionalFilters) && (
				<DataTableToolbar
					table={table}
					searchable={searchable}
					searchColumn={searchColumn}
					searchDebounceMs={searchDebounceMs}
					exportable={exportable}
					onExport={handleExport}
					onGlobalSearch={onGlobalSearch}
					searchPlaceholder={searchPlaceholder}
					renderAdditionalFilters={renderAdditionalFilters}
				/>
			)}
			<div className="rounded-md border bg-card">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{loading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={`loading-${i}`}>
									{columns.map((_, j) => (
										<TableCell key={`loading-${i}-${j}`}>
											<Skeleton className="h-6 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<React.Fragment key={row.id}>
									<TableRow
										data-state={row.getIsSelected() && 'selected'}
										onClick={() => onRowClick?.(row.original)}
										className={onRowClick ? 'cursor-pointer' : ''}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
									{row.getIsExpanded() && renderSubComponent && (
										<TableRow>
											<TableCell colSpan={row.getVisibleCells().length}>
												{renderSubComponent({ row })}
											</TableCell>
										</TableRow>
									)}
								</React.Fragment>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={finalColumns.length}
									className="h-24 text-center"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			{paginable && (
				<DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
			)}
		</div>
	)
}
