'use client'

import {
	CrudTable,
	type CrudTableColumn,
} from '@/features/admin/shared/CrudTable'
import { Badge } from '@/features/shared/ui/badge'
import type { Product } from '../types/product.types'

interface ProductsTableProps {
	products: Product[]
	isLoading: boolean
	onEdit: (product: Product) => void
	onDelete: (product: Product) => void
}

export function ProductsTable({
	products,
	isLoading,
	onEdit,
	onDelete,
}: ProductsTableProps) {
	const columns: CrudTableColumn<Product>[] = [
		{
			key: 'idProduct',
			header: 'ID',
			cellRenderer: (value) => (
				<span className="font-medium">#{String(value)}</span>
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
			key: 'company',
			header: 'Compañía',
			cellRenderer: (_, row) => (
				<span className="text-sm text-muted-foreground">
					{row.company?.name ?? '—'}
				</span>
			),
		},
		{
			key: 'description',
			header: 'Descripción',
			cellRenderer: (value) =>
				value ? (
					<span className="text-sm text-muted-foreground line-clamp-2">
						{value as string}
					</span>
				) : (
					<span className="text-muted-foreground">-</span>
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
			data={products}
			columns={columns}
			onEdit={onEdit}
			onDelete={onDelete}
			isLoading={isLoading}
			searchable={false}
			emptyMessage="No hay productos registrados"
		/>
	)
}
