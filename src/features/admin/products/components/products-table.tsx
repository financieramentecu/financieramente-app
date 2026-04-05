import { DataTable } from '@/features/shared/ui/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Product } from '@/features/product/types/product.types'

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
	const columns: ColumnDef<Product>[] = [
		{
			accessorKey: 'idProduct',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="ID" />
			),
			cell: ({ row }) => (
				<span className="font-medium">#{row.getValue('idProduct')}</span>
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
			accessorKey: 'company.name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Compañía" />
			),
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{row.original.company?.name ?? '—'}
				</span>
			),
		},
		{
			accessorKey: 'description',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Descripción" />
			),
			cell: ({ row }) => {
				const value = row.getValue('description') as string
				return value ? (
					<span className="text-sm text-muted-foreground line-clamp-2">
						{value}
					</span>
				) : (
					<span className="text-muted-foreground">—</span>
				)
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
					<Badge variant={status ? 'success' : 'neutral'}>
						{status ? 'Activo' : 'Inactivo'}
					</Badge>
				)
			},
		},
	]

	return (
		<DataTable
			data={products}
			columns={columns}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			emptyMessage="No hay productos registrados"
			actions={(product) => (
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onEdit(product)}
						className="h-8 w-8 p-0"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDelete(product)}
						className="h-8 w-8 p-0 text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</>
			)}
		/>
	)
}
