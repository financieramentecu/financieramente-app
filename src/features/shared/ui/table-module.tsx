'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable/DataTable'
import { createColumnDefs } from './DataTable/column-utils'
import { Button } from './button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'

// Types
export interface TableModuleProps<TData> {
	data: TData[]
	columns: ColumnDef<TData>[]
	title?: string
	description?: string
	defaultPageSize?: number
	loading?: boolean
	emptyMessage?: string
	onRowClick?: (row: TData) => void
	onSelectionChange?: (selectedRows: TData[]) => void
	onExport?: (data: TData[]) => void
	onEdit?: (row: TData) => void
	onDelete?: (row: TData) => void
	onView?: (row: TData) => void
	customActions?: (row: TData) => React.ReactNode
	searchable?: boolean
	searchPlaceholder?: string
	paginable?: boolean
	selectable?: boolean
	exportable?: boolean
	filterable?: boolean
}

// Default actions component
const DefaultActions = <TData,>({
	row,
	onEdit,
	onDelete,
	onView,
}: {
	row: TData
	onEdit?: (row: TData) => void
	onDelete?: (row: TData) => void
	onView?: (row: TData) => void
}) => {
	const hasActions = onEdit || onDelete || onView

	if (!hasActions) return null

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">Abrir menú</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Acciones</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{onView && (
					<DropdownMenuItem onClick={() => onView(row)}>
						<Eye className="mr-2 h-4 w-4" />
						Ver detalles
					</DropdownMenuItem>
				)}
				{onEdit && (
					<DropdownMenuItem onClick={() => onEdit(row)}>
						<Edit className="mr-2 h-4 w-4" />
						Editar
					</DropdownMenuItem>
				)}
				{onDelete && (
					<DropdownMenuItem
						onClick={() => onDelete(row)}
						className="text-destructive"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Eliminar
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

// Main TableModule component
export function TableModule<TData>({
	data,
	columns,
	title,
	description,
	defaultPageSize = 10,
	loading = false,
	emptyMessage = 'No hay datos disponibles',
	onRowClick,
	onSelectionChange,
	onExport,
	onEdit,
	onDelete,
	onView,
	customActions,
	searchable,
	searchPlaceholder,
	paginable,
	selectable,
	exportable,
	filterable,
}: TableModuleProps<TData>) {
	// Create actions function
	const actions = React.useCallback(
		(row: TData) => {
			if (customActions) {
				return customActions(row)
			}

			return (
				<DefaultActions
					row={row}
					onEdit={onEdit}
					onDelete={onDelete}
					onView={onView}
				/>
			)
		},
		[customActions, onEdit, onDelete, onView]
	)

	return (
		<div className="space-y-4">
			{(title || description) && (
				<div className="space-y-1">
					{title && (
						<h2 className="text-2xl font-bold tracking-tight">{title}</h2>
					)}
					{description && (
						<p className="text-muted-foreground">{description}</p>
					)}
				</div>
			)}

			<DataTable
				columns={columns}
				data={data}
				loading={loading}
				emptyMessage={emptyMessage}
				pageSize={defaultPageSize}
				manualPagination={false}
				onRowClick={onRowClick}
				onSelectionChange={onSelectionChange}
				onExport={onExport}
				actions={actions}
				searchable={searchable}
				searchPlaceholder={searchPlaceholder}
				paginable={paginable}
				selectable={selectable}
				exportable={exportable}
			/>
		</div>
	)
}

// Utility functions for common table configurations
export const TableConfigs = {
	// Users table configuration
	users: {
		columns: [
			createColumnDefs.text('name', 'Nombre', { searchable: true }),
			createColumnDefs.text('email', 'Email', { searchable: true }),
			createColumnDefs.badge('role', 'Rol', {
				getVariant: (role: unknown) => {
					switch (String(role)) {
						case 'Administrador':
							return 'default'
						case 'Supervisor':
							return 'secondary'
						default:
							return 'outline'
					}
				},
			}),
			createColumnDefs.badge('status', 'Estado', {
				getVariant: (status: unknown) =>
					String(status) === 'Activo' ? 'default' : 'destructive',
			}),
			createColumnDefs.text('department', 'Departamento'),
			createColumnDefs.date('lastLogin', 'Último Acceso'),
			createColumnDefs.currency('salary', 'Salario', { currency: 'USD' }),
		],
		searchColumn: 'name',
		defaultPageSize: 10,
	},

	// Products table configuration
	products: {
		columns: [
			createColumnDefs.text('name', 'Producto', { searchable: true }),
			createColumnDefs.text('category', 'Categoría'),
			createColumnDefs.currency('price', 'Precio', { currency: 'USD' }),
			createColumnDefs.text('stock', 'Stock'),
			createColumnDefs.badge('status', 'Estado', {
				getVariant: (status: unknown) => {
					switch (String(status)) {
						case 'Disponible':
							return 'default'
						case 'Agotado':
							return 'destructive'
						case 'Próximamente':
							return 'secondary'
						default:
							return 'outline'
					}
				},
			}),
			createColumnDefs.date('createdAt', 'Fecha Creación'),
		],
		searchColumn: 'name',
		defaultPageSize: 15,
	},

	// Orders table configuration
	orders: {
		columns: [
			createColumnDefs.text('id', 'ID Pedido'),
			createColumnDefs.text('customer', 'Cliente', { searchable: true }),
			createColumnDefs.currency('total', 'Total', { currency: 'USD' }),
			createColumnDefs.badge('status', 'Estado', {
				getVariant: (status: unknown) => {
					switch (String(status)) {
						case 'Completado':
							return 'default'
						case 'Pendiente':
							return 'secondary'
						case 'Cancelado':
							return 'destructive'
						default:
							return 'outline'
					}
				},
			}),
			createColumnDefs.date('orderDate', 'Fecha Pedido'),
			createColumnDefs.date('deliveryDate', 'Fecha Entrega'),
		],
		searchColumn: 'customer',
		defaultPageSize: 20,
	},
}

// Hook for easy table creation
export function useTableModule<TData>() {
	const createTable = React.useCallback(
		(
			config: Partial<TableModuleProps<TData>> & {
				data: TData[]
				columns: ColumnDef<TData>[]
			}
		) => {
			const TableComponent = (props: Partial<TableModuleProps<TData>> = {}) => (
				<TableModule {...config} {...props} />
			)
			TableComponent.displayName = 'TableComponent'
			return TableComponent
		},
		[]
	)

	return { createTable }
}

// Export everything
export { createColumnDefs }

