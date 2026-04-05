'use client'

import React, { useMemo } from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Category, CATEGORY_TYPES, SYSTEM_CATEGORY_TYPE_NAME } from '../types/category.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { ColumnDef } from '@tanstack/react-table'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface CategoriesTableSectionProps {
	data: Category[]
	onAddCategory: () => void
	onGlobalSearch: (query: string) => void
	onEditCategory: (category: Category) => void
	onDeleteCategory: (category: Category) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
	selectedTypeCategory?: string
	onTypeCategoryChange?: (value: string) => void
}

const CATEGORY_TYPE_LABELS: Record<string, string> = {
	MMS: 'MMS',
	ALIADO: 'Aliado',
	TRINITY: 'Trinity',
}

export function CategoriesTableSection({
	data,
	onAddCategory,
	onGlobalSearch,
	onEditCategory,
	onDeleteCategory,
	pagination,
	onPageChange,
	isSearching = false,
	selectedTypeCategory,
	onTypeCategoryChange,
}: CategoriesTableSectionProps) {
	const columns = useMemo<ColumnDef<Category>[]>(
		() => [
			{
				accessorKey: 'code',
				header: 'Código',
				cell: ({ row }) => (
					<span className="font-mono text-sm">{row.original.code}</span>
				),
			},
			{
				accessorKey: 'name',
				header: 'Nombre',
			},
			{
				accessorKey: 'typeCategory',
				header: 'Tipo',
				cell: ({ row }) => (
					<Badge variant="outline">
						{CATEGORY_TYPE_LABELS[row.original.typeCategory] || row.original.typeCategory}
					</Badge>
				),
			},
			{
				accessorKey: 'beneficiaryMode',
				header: 'Beneficiario',
				cell: ({ row }) => {
					const isFixed = row.original.beneficiaryMode === 'FIXED_BENEFICIARY'
					const isSystemType = row.original.typeCategory === SYSTEM_CATEGORY_TYPE_NAME
					return (
						<div className="flex flex-col gap-0.5">
							<Badge variant={isFixed ? 'outline' : 'secondary'} className="w-fit text-xs">
								{isFixed ? 'Fijo' : 'Por cadena'}
							</Badge>
							{isSystemType && isFixed && row.original.fixedBeneficiaryUser ? (
								<span className="text-xs text-muted-foreground">
									{row.original.fixedBeneficiaryUser.name} {row.original.fixedBeneficiaryUser.lastName}
								</span>
							) : null}
						</div>
					)
				},
			},
			{
				accessorKey: 'descripcion',
				header: 'Descripción',
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm truncate max-w-xs block">
						{row.original.descripcion || '-'}
					</span>
				),
			},
			{
				accessorKey: 'status',
				header: 'Estado',
				cell: ({ row }) => (
					<Badge variant={row.original.status ? 'success' : 'destructive'}>
						{row.original.status ? 'Activo' : 'Inactivo'}
					</Badge>
				),
			},
			{
				accessorKey: 'createdAt',
				header: 'Fecha Creación',
				cell: ({ row }) => {
					const value = row.original.createdAt
					if (!value) return '-'
					const date = new Date(String(value))
					return date.toLocaleDateString('es-CO', {
						year: 'numeric',
						month: 'short',
						day: 'numeric',
					})
				},
			},
		],
		[]
	)

	// Additional filters for type category
	const renderAdditionalFilters = () => {
		if (!onTypeCategoryChange) return null
		return (
			<Select
				value={selectedTypeCategory || 'all'}
				onValueChange={onTypeCategoryChange}
			>
				<SelectTrigger className="w-full sm:w-[180px] min-w-0">
					<SelectValue placeholder="Filtrar por tipo" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todos los tipos</SelectItem>
					{CATEGORY_TYPES.map((type) => (
						<SelectItem key={type} value={type}>
							{CATEGORY_TYPE_LABELS[type] || type}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<h2 className="text-xl font-semibold">Categorías de Agentes</h2>
				<Button onClick={onAddCategory} className="cursor-pointer">
					<Plus className="h-4 w-4 mr-2" />
					Crear Categoría
				</Button>
			</div>

			{/* Table */}
			<DataTable
				data={data}
				columns={columns}
				onGlobalSearch={onGlobalSearch}
				searchPlaceholder="Buscar por código o nombre..."
				manualPagination={!!pagination}
				currentPage={pagination?.page}
				pageSize={pagination?.pageSize}
				totalItems={pagination?.total}
				onPageChange={onPageChange}
				searchable
				loading={isSearching}
				renderAdditionalFilters={renderAdditionalFilters}
				actions={(category) => (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onEditCategory(category)}
							title="Editar categoría"
							className="cursor-pointer"
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onDeleteCategory(category)}
							title="Eliminar categoría"
							className="text-destructive hover:text-destructive cursor-pointer"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				)}
			/>
		</div>
	)
}


