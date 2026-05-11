'use client'

import React, { useMemo } from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import type { Category } from '../types/category.types'

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
}: CategoriesTableSectionProps) {
	const columns = useMemo<ColumnDef<Category>[]>(
		() => [
			{
				accessorKey: 'name',
				header: 'Nombre',
			},
			{
				accessorKey: 'categoryType',
				header: 'Tipo',
				cell: ({ row }) => {
					const ct = row.original.categoryType
					if (!ct?.name) return <span className="text-muted-foreground">—</span>
					return <Badge variant="outline">{ct.name}</Badge>
				},
			},
			{
				accessorKey: 'description',
				header: 'Descripción',
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm truncate max-w-xs block">
						{row.original.description || '-'}
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

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<h2 className="text-xl font-semibold">Categorías</h2>
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
				searchPlaceholder="Buscar por nombre..."
				manualPagination={!!pagination}
				currentPage={pagination?.page}
				pageSize={pagination?.pageSize}
				totalItems={pagination?.total}
				onPageChange={onPageChange}
				searchable
				loading={isSearching}
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
