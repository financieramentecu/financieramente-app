import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Currency } from '../types/currency.types'

interface CurrenciesTableProps {
	currencies: Currency[]
	isLoading: boolean
	onEdit: (currency: Currency) => void
	onDelete: (currency: Currency) => void
}

export function CurrenciesTable({
	currencies,
	isLoading,
	onEdit,
	onDelete,
}: CurrenciesTableProps) {
	const columns: ColumnDef<Currency>[] = [
		{
			accessorKey: 'idCurrency',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="ID" />
			),
			cell: ({ row }) => (
				<span className="font-medium">#{row.getValue('idCurrency')}</span>
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
			accessorKey: 'symbol',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Símbolo" />
			),
			cell: ({ row }) => {
				const value = row.getValue('symbol') as string
				return <span className="text-sm">{value || '—'}</span>
			},
		},
		{
			accessorKey: 'active',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Estado" />
			),
			cell: ({ row }) => {
				const active = row.getValue('active') as boolean
				return (
					<Badge variant={active ? 'success' : 'neutral'}>
						{active ? 'Activa' : 'Inactiva'}
					</Badge>
				)
			},
		},
	]

	return (
		<DataTable
			data={currencies}
			columns={columns}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			emptyMessage="No hay monedas registradas"
			actions={(currency) => (
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onEdit(currency)}
						className="h-8 w-8 p-0"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDelete(currency)}
						className="h-8 w-8 p-0 text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</>
			)}
		/>
	)
}

