'use client'

import { DataTable, DataTableColumnHeader } from '@/features/shared/ui/DataTable'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Category } from '@/features/categories/types/category.types'

interface CategoriesTableProps {
	categories: Category[]
	isLoading: boolean
	onEdit: (category: Category) => void
	onDelete: (category: Category) => void
}

const CATEGORY_LABELS: Record<Category['typeCategory'], string> = {
	MMS: 'MMS',
	ALIADO: 'Aliado',
	TRINITY: 'Trinity',
}

export function AdminCategoriesTable({
	categories,
	isLoading,
	onEdit,
	onDelete,
}: CategoriesTableProps) {
	const columns: ColumnDef<Category>[] = [
		{
			accessorKey: 'idCategory',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="ID" />
			),
			cell: ({ row }) => (
				<span className="font-medium">#{row.getValue('idCategory')}</span>
			),
		},
		{
			accessorKey: 'code',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Código" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue('code')}</span>
			),
		},
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Nombre" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue('name')}</span>
			),
		},
		{
			accessorKey: 'typeCategory',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Tipo" />
			),
			cell: ({ row }) => {
				const value = row.getValue('typeCategory') as Category['typeCategory']
				return <span className="text-sm">{CATEGORY_LABELS[value]}</span>
			},
		},
		{
			accessorKey: 'status',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Estado" />
			),
			cell: ({ row }) => {
				const status = row.getValue('status') as boolean
				return (
					<Badge variant={status ? 'default' : 'secondary'}>
						{status ? 'Activo' : 'Inactivo'}
					</Badge>
				)
			},
		},
	]

	return (
		<DataTable
			data={categories}
			columns={columns}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			emptyMessage="No hay categorías registradas"
			actions={(category) => (
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onEdit(category)}
						className="h-8 w-8 p-0"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDelete(category)}
						className="h-8 w-8 p-0 text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</>
			)}
		/>
	)
}

