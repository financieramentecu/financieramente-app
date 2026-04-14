'use client'

import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { Button } from '@/features/shared/ui/button'
import type { ProductConfiguration } from '../types/product-configuration.types'
import { CheckCircle2, Plus, Pencil } from 'lucide-react'
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
import { Badge } from '@/features/shared/ui/badge'

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
			id: 'distributionSetup',
			header: () => (
				<span
					className="cursor-help border-b border-dotted border-muted-foreground/50"
					title="Pendiente: falta guardar porcentajes por categoría en una regla. Configurada: ya hay al menos una línea guardada."
				>
					Distribución
				</span>
			),
			cell: ({ row }) => {
				const config = row.original
				const code = config.code?.trim()
				const incomplete = config.distributionSetupIncomplete === true

				if (incomplete) {
					return (
						<div className="flex max-w-56 flex-col gap-1.5">
							<Badge variant="secondary" className="w-fit font-normal">
								Pendiente
							</Badge>
							{code ? (
								<Link
									href={`/dashboard/config-distribucion-comisiones/${encodeURIComponent(code)}/reglas/crear`}
									className="text-primary text-sm font-medium underline-offset-4 hover:underline"
								>
									Continuar configuración
								</Link>
							) : null}
						</div>
					)
				}

				return (
					<span
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
						title="Ya hay al menos una línea de categoría guardada en una regla de distribución"
					>
						<CheckCircle2
							className="h-4 w-4 shrink-0 text-emerald-600"
							aria-hidden
						/>
						Configurada
					</span>
				)
			},
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
			accessorKey: 'active',
			header: 'Estado',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Switch
						checked={row.original.active}
						onCheckedChange={() => onToggleActive(row.original)}
						aria-label={
							row.original.active ? 'Desactivar producto' : 'Activar producto'
						}
					/>
				</div>
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
					<div className="flex flex-wrap items-center gap-1">
						<Button asChild variant="default" size="sm" className="cursor-pointer">
							<Link
								href={
									row.code?.trim()
										? `/dashboard/config-distribucion-comisiones/${encodeURIComponent(row.code.trim())}/reglas`
										: '/dashboard/config-distribucion-comisiones'
								}
							>
								Distribución de Comisión
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
					</div>
				)}
			/>
		</div>
	)
}

