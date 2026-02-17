'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Category, CATEGORY_TYPES } from '../types/category.types'
import { DataTableColumn } from '@/features/shared/ui/types/dashboard.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
	const columns: DataTableColumn<Category>[] = [
		{
			key: 'code',
			header: 'Código',
			sortable: true,
			cellRenderer: (value) => (
				<span className="font-mono text-sm">{String(value)}</span>
			),
		},
		{
			key: 'name',
			header: 'Nombre',
			sortable: true,
		},
		{
			key: 'typeCategory',
			header: 'Tipo',
			sortable: true,
			cellRenderer: (value) => (
				<Badge variant="outline">
					{CATEGORY_TYPE_LABELS[String(value)] || String(value)}
				</Badge>
			),
		},
		{
			key: 'descripcion',
			header: 'Descripción',
			cellRenderer: (value) => (
				<span className="text-muted-foreground text-sm truncate max-w-xs block">
					{value ? String(value) : '-'}
				</span>
			),
		},
		{
			key: 'status',
			header: 'Estado',
			sortable: true,
			cellRenderer: (value) => (
				<Badge variant={value ? 'default' : 'secondary'}>
					{value ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
		{
			key: 'createdAt',
			header: 'Fecha Creación',
			sortable: true,
			cellRenderer: (value) => {
				if (!value) return '-'
				const date = new Date(String(value))
				return date.toLocaleDateString('es-CO', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
				})
			},
		},
		{
			key: 'idCategory',
			header: 'Acciones',
			cellRenderer: (_, row) => (
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onEditCategory(row)}
						title="Editar categoría"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onDeleteCategory(row)}
						title="Eliminar categoría"
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	]

	// Transform pagination to DataTable format
	const dataTablePagination =
		pagination && onPageChange
			? {
					currentPage: pagination.page,
					pageSize: pagination.pageSize,
					totalItems: pagination.total,
					onPageChange: onPageChange,
				}
			: undefined

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
				<Button onClick={onAddCategory}>
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
				pagination={dataTablePagination}
				searchable
				loading={isSearching}
				renderAdditionalFilters={renderAdditionalFilters}
			/>
		</div>
	)
}
