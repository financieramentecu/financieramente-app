'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import type { ProductConfiguration } from '../types/product-configuration.types'
import type { DataTableColumn } from '@/features/shared/ui/types/dashboard.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface ProductConfigurationsTableProps {
	data: ProductConfiguration[]
	onAddConfiguration: () => void
	onGlobalSearch: (query: string) => void
	onEditConfiguration: (config: ProductConfiguration) => void
	onToggleActive: (config: ProductConfiguration) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
	selectedActive?: string
	onActiveChange?: (value: string) => void
}

export function ProductConfigurationsTableSection({
	data,
	onAddConfiguration,
	onGlobalSearch,
	onEditConfiguration,
	onToggleActive,
	pagination,
	onPageChange,
	isSearching = false,
	selectedActive,
	onActiveChange,
}: ProductConfigurationsTableProps) {
	const columns: DataTableColumn<ProductConfiguration>[] = [
		{
			key: 'code',
			header: 'Código',
			sortable: true,
			cellRenderer: (value) => (
				<span className="font-mono text-sm">{String(value)}</span>
			),
		},
		{
			key: 'product',
			header: 'Producto',
			sortable: false,
			cellRenderer: (_, row) => (
				<span className="text-sm">{row.product.name}</span>
			),
		},
		{
			key: 'idProduct',
			header: 'Compañía',
			sortable: false,
			cellRenderer: (_, row) => (
				<span className="text-sm text-muted-foreground">
					{row.product.company.name}
				</span>
			),
		},
		{
			key: 'clientOrigin',
			header: 'Origen',
			sortable: false,
			cellRenderer: (_, row) => (
				<span className="text-sm">{row.clientOrigin.name}</span>
			),
		},
		{
			key: 'category',
			header: 'Categoría',
			sortable: false,
			cellRenderer: (_, row) => (
				<span className="text-sm">{row.category.name}</span>
			),
		},
		{
			key: 'active',
			header: 'Estado',
			sortable: true,
			cellRenderer: (value) => (
				<Badge variant={value ? 'default' : 'secondary'}>
					{value ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
		{
			key: 'id',
			header: 'Acciones',
			cellRenderer: (_, row) => (
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onEditConfiguration(row)}
						title="Editar configuración"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onToggleActive(row)}
						title={
							row.active
								? 'Desactivar configuración'
								: 'Activar configuración'
						}
					>
						{row.active ? (
							<ToggleRight className="h-4 w-4" />
						) : (
							<ToggleLeft className="h-4 w-4 text-muted-foreground" />
						)}
					</Button>
				</div>
			),
		},
	]

	const dataTablePagination =
		pagination && onPageChange
			? {
					currentPage: pagination.page,
					pageSize: pagination.pageSize,
					totalItems: pagination.total,
					onPageChange: onPageChange,
				}
			: undefined

	const renderAdditionalFilters = () => {
		if (!onActiveChange) return null
		return (
			<Select
				value={selectedActive || 'all'}
				onValueChange={onActiveChange}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Filtrar por estado" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todos</SelectItem>
					<SelectItem value="active">Activo</SelectItem>
					<SelectItem value="inactive">Inactivo</SelectItem>
				</SelectContent>
			</Select>
		)
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<h2 className="text-xl font-semibold">
					Configuraciones de Producto
				</h2>
				<Button onClick={onAddConfiguration}>
					<Plus className="h-4 w-4 mr-2" />
					Crear Configuración
				</Button>
			</div>

			{/* Table */}
			<DataTable
				data={data}
				columns={columns}
				onGlobalSearch={onGlobalSearch}
				searchPlaceholder="Buscar por código, producto, origen o categoría..."
				pagination={dataTablePagination}
				searchable
				loading={isSearching}
				renderAdditionalFilters={renderAdditionalFilters}
			/>
		</div>
	)
}
