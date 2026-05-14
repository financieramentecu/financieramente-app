'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
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
	HeaderContext,
	CellContext,
	type Updater,
} from '@tanstack/react-table'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableFooter,
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
	searchDebounceMs = 0,
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
	toolbarTrailingActions,
	getRowAriaLabel,
	showFooter = false,
	initialSorting = [],
	manualSorting = false,
	onSortingChange: onExternalSortingChange,
	dense = false,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting)

	const handleSortingChange = useCallback(
		(updater: Updater<SortingState>) => {
			const next = typeof updater === 'function' ? updater(sorting) : updater
			setSorting(next)
			if (manualSorting && onExternalSortingChange) {
				onExternalSortingChange(next)
			}
		},
		[sorting, manualSorting, onExternalSortingChange]
	)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState<string>('')
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [internalRowSelection, setInternalRowSelection] = useState({})
	const [expanded, setExpanded] = useState<ExpandedState>({})
	const [pagination, setPagination] = useState({
		pageIndex: (currentPage ?? 1) - 1,
		pageSize: propPageSize ?? defaultPageSize,
	})

	// Sincronizar sorting inicial si cambia desde afuera
	useEffect(() => {
		if (initialSorting && initialSorting.length > 0) {
			setSorting(initialSorting)
		} else if (initialSorting && initialSorting.length === 0 && sorting.length > 0) {
			setSorting([])
		}
	}, [initialSorting, sorting.length])

	// Definición final de columnas (inyectando selección y acciones)
	const finalColumns = useMemo(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cols = columns.map((col: any) => ({
			...col,
			id: col.id || col.accessorKey,
			filterFn: col.filterFn ?? 'includesString',
		}))

		// Inyectar columna de checkboxes si es selectable o enableRowSelection o hay callback de selección
		if (selectable || enableRowSelection || !!onSelectionChange) {
			cols.unshift({
				id: 'select',
				header: ({ table }: HeaderContext<TData, unknown>) => (
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
				cell: ({ row }: CellContext<TData, unknown>) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						disabled={!row.getCanSelect()}
						aria-label={
							getRowAriaLabel
								? getRowAriaLabel(row.original)
								: 'Seleccionar fila'
						}
						className="translate-y-[2px]"
					/>
				),
				enableSorting: false,
				enableHiding: false,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as unknown as any)
		}

		// Inyectar columna de acciones si existe el prop
		if (actions) {
			cols.push({
				id: 'actions',
				header: () => (
					<div className="text-right pr-4">
						Acciones
					</div>
				),
				cell: ({ row }: CellContext<TData, unknown>) => (
					<div className="flex items-center justify-end">
						{actions(row.original)}
					</div>
				),
				enableSorting: false,
				enableHiding: false,
				meta: {
					sticky: 'right',
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as unknown as any)
		}

		return cols
	}, [columns, selectable, enableRowSelection, actions, getRowAriaLabel, onSelectionChange])

	// Sincronización de selección controlada/no-controlada
	const rowSelection = selectedRowIds ?? externalRowSelection ?? internalRowSelection
	const onRowSelectionChange = onExternalRowSelectionChange ?? setInternalRowSelection

	// Sincronización de tamaño de página si cambia el prop
	useEffect(() => {
		if (propPageSize !== undefined && propPageSize !== pagination.pageSize) {
			setPagination((prev) => ({ ...prev, pageSize: propPageSize }))
		}
	}, [propPageSize, pagination.pageSize])

	// Sincronización de página actual si cambia el prop (manual)
	useEffect(() => {
		if (currentPage !== undefined && (currentPage - 1) !== pagination.pageIndex) {
			setPagination((prev) => ({ ...prev, pageIndex: currentPage - 1 }))
		}
	}, [currentPage, pagination.pageIndex])

	const table = useReactTable<TData>({
		data,
		columns: finalColumns,
		state: {
			sorting,
			columnFilters,
			globalFilter,
			columnVisibility,
			rowSelection,
			expanded,
			pagination,
		},
		enableRowSelection,
		enableFilters: true,
		enableColumnFilters: true,
		enableGlobalFilter: true,
		manualPagination,
		manualSorting,
		manualFiltering: false,
		autoResetPageIndex: !manualPagination,
		rowCount: manualPagination ? totalItems : undefined,
		onRowSelectionChange,
		onSortingChange: handleSortingChange,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onColumnVisibilityChange: setColumnVisibility,
		onExpandedChange: setExpanded,
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand,
		onPaginationChange: (updater) => {
			const nextState =
				typeof updater === 'function' ? updater(pagination) : updater

			setPagination(nextState)

			if (manualPagination && onPageChange && nextState.pageIndex !== pagination.pageIndex) {
				onPageChange(nextState.pageIndex + 1)
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId,
		meta: {
			searchable,
			searchPlaceholder: searchPlaceholder || 'Buscar...',
			renderAdditionalFilters,
			exportable,
			exportConfig,
			onExport,
		},
		initialState: {
			pagination: {
				pageSize: propPageSize ?? defaultPageSize,
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
			exportData as unknown[],
			exportConfig?.fileName || 'exportacion-tabla',
			exportConfig?.sheetName
		)
	}

	const isExportable = exportable || !!onExport

	const showToolbar =
		searchable ||
		isExportable ||
		!!renderAdditionalFilters ||
		!!toolbarTrailingActions

	return (
		<div className={cn('grid grid-rows-[auto_1fr_auto] h-full w-full min-w-0 overflow-hidden gap-4', className)}>
			{showToolbar && (
				<div className="min-h-0 shrink-0 w-full py-2">
					<DataTableToolbar
						table={table}
						setColumnFilters={setColumnFilters}
						globalFilter={globalFilter}
						setGlobalFilter={setGlobalFilter}
						searchable={searchable}
						searchColumn={searchColumn}
						searchDebounceMs={searchDebounceMs}
						exportable={isExportable}
						onExport={handleExport}
						onGlobalSearch={onGlobalSearch}
						searchPlaceholder={searchPlaceholder}
						renderAdditionalFilters={renderAdditionalFilters}
						toolbarTrailingActions={toolbarTrailingActions}
					/>
				</div>
			)}
			<div className="rounded-md border bg-card min-h-0 w-full overflow-hidden flex flex-col relative">
				<Table
					className={cn('relative', dense && 'dense')}
					containerClassName="flex-1 overflow-auto max-h-none"
				>
					<TableHeader className="sticky top-0 z-10">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const meta = header.column.columnDef.meta as Record<string, unknown> | undefined
									const sticky = meta?.sticky as string | undefined
									return (
										<TableHead
											key={header.id}
											className={cn(
												sticky === 'left' && 'sticky left-0 z-30 bg-card shadow-[1px_0_0_0_hsl(var(--border))]',
												sticky === 'right' && 'sticky right-0 z-30 bg-card shadow-[-1px_0_0_0_hsl(var(--border))]'
											)}
										>
											{header.isPlaceholder
												? null
												: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{loading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={`loading-${i}`}>
									{finalColumns.map((_, j) => (
										<TableCell key={`loading-${i}-${j}`}>
											<Skeleton
												className="h-6 w-full"
												data-testid="skeleton"
											/>
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
										{row.getVisibleCells().map((cell) => {
											const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
											const sticky = meta?.sticky as string | undefined
											return (
												<TableCell
													key={cell.id}
													className={cn(
														sticky === 'left' && 'sticky left-0 z-20 bg-card shadow-[1px_0_0_0_hsl(var(--border))]',
														sticky === 'right' && 'sticky right-0 z-20 bg-card shadow-[-1px_0_0_0_hsl(var(--border))]'
													)}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext()
													)}
												</TableCell>
											)
										})}
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
					{showFooter && (
						<TableFooter className="sticky bottom-0 z-10 bg-muted/50">
							{table.getFooterGroups().map((footerGroup) => (
								<TableRow
									key={footerGroup.id}
									className="hover:bg-transparent border-b-0"
								>
									{footerGroup.headers.map((header) => (
										<TableCell
											key={header.id}
											className="p-4 text-xs font-bold text-foreground align-middle"
										>
											{header.isPlaceholder
												? null
												: flexRender(
													header.column.columnDef.footer,
													header.getContext()
												)}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableFooter>
					)}
				</Table>
			</div>
			{paginable && (
				<div className="shrink-0 pt-2">
					<DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
				</div>
			)}
		</div>
	)
}
