'use client'

import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { Button } from '@/features/shared/ui/button'
import type { ProductConfiguration } from '../types/product-configuration.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import Link from 'next/link'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Switch } from '@/features/shared/ui/switch'
import { ColumnDef } from '@tanstack/react-table'

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
	const columns: ColumnDef<ProductConfiguration>[] = [
		{
			accessorKey: 'code',
			header: 'Código',
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.original.code}</span>
			),
		},
		{
			accessorKey: 'product.name',
			header: 'Producto',
			cell: ({ row }) => (
				<span className="text-sm">{row.original.product.name}</span>
			),
		},
		{
			accessorKey: 'product.company.name',
			header: 'Compañía',
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{row.original.product.company.name}
				</span>
			),
		},
		{
			accessorKey: 'clientOrigin.name',
			header: 'Origen',
			cell: ({ row }) => (
				<span className="text-sm">{row.original.clientOrigin.name}</span>
			),
		},
		{
			accessorKey: 'category.name',
			header: 'Categoría',
			cell: ({ row }) => (
				<span className="text-sm">{row.original.category.name}</span>
			),
		},
		{
			accessorKey: 'newBusinessesDistributionDescription',
			header: 'Distribución para nuevos negocios',
			cell: ({ row }) => {
				const description =
					row.original.newBusinessesDistributionDescription ||
					row.original.ppcNewBusinesses?.description ||
					'Sin descripción'

				return (
					<span
						className={`text-sm ${
							description === 'Sin asignar' ? 'text-muted-foreground' : ''
						}`}
					>
						{description}
					</span>
				)
			},
		},
		{
			accessorKey: 'active',
			header: 'Estado',
			cell: ({ row }) => (
				<Badge variant={row.original.active ? 'success' : 'destructive'}>
					{row.original.active ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
	]

	const renderAdditionalFilters = () => {
		if (!onActiveChange) return null
		return (
			<Select value={selectedActive || 'all'} onValueChange={onActiveChange}>
				<SelectTrigger className="w-full sm:w-[180px] min-w-0">
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
				<h2 className="text-xl font-semibold">Configuraciones de Producto</h2>
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
				manualPagination={!!pagination}
				currentPage={pagination?.page}
				pageSize={pagination?.pageSize}
				totalItems={pagination?.total}
				onPageChange={onPageChange}
				searchable
				loading={isSearching}
				renderAdditionalFilters={renderAdditionalFilters}
				actions={(row) => (
					<div className="flex items-center gap-1">
						<Button asChild variant="default" size="sm" className="cursor-pointer">
							<Link href={`/dashboard/distribucion-comisiones/${row.id}/reglas`}>
								Configuración comisión
							</Link>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onEditConfiguration(row)}
							title="Editar configuración"
							className="cursor-pointer"
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<Switch
							checked={row.active}
							onCheckedChange={() => onToggleActive(row)}
							aria-label={
								row.active ? 'Desactivar configuración' : 'Activar configuración'
							}
							className="cursor-pointer"
						/>
					</div>
				)}
			/>
		</div>
	)
}

