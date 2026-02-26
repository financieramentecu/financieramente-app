'use client'

import {
	CrudTable,
	type CrudTableColumn,
} from '@/features/admin/shared/CrudTable'
import { Badge } from '@/features/shared/ui/badge'
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

export function CategoriesTable({
	categories,
	isLoading,
	onEdit,
	onDelete,
}: CategoriesTableProps) {
	const columns: CrudTableColumn<Category>[] = [
		{
			key: 'idCategory',
			header: 'ID',
			cellRenderer: (value) => (
				<span className="font-medium">#{String(value)}</span>
			),
		},
		{
			key: 'code',
			header: 'Código',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'name',
			header: 'Nombre',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'typeCategory',
			header: 'Tipo',
			cellRenderer: (value) => (
				<span className="text-sm">
					{CATEGORY_LABELS[value as Category['typeCategory']]}
				</span>
			),
		},
		{
			key: 'status',
			header: 'Estado',
			cellRenderer: (value) => (
				<Badge variant={(value as boolean) ? 'success' : 'neutral'}>
					{(value as boolean) ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
	]

	return (
		<CrudTable
			data={categories}
			columns={columns}
			onEdit={onEdit}
			onDelete={onDelete}
			isLoading={isLoading}
			searchable={true}
			emptyMessage="No hay categorías registradas"
		/>
	)
}
