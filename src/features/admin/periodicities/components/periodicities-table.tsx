import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Periodicity } from '../types/periodicity.types'

interface PeriodicitiesTableProps {
	periodicities: Periodicity[]
	isLoading: boolean
	onEdit: (periodicity: Periodicity) => void
	onDelete: (periodicity: Periodicity) => void
}

export function PeriodicitiesTable({
	periodicities,
	isLoading,
	onEdit,
	onDelete,
}: PeriodicitiesTableProps) {
	const columns: ColumnDef<Periodicity>[] = [
		{
			accessorKey: 'idBuyPeriodicity',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="ID" />
			),
			cell: ({ row }) => (
				<span className="font-medium">#{row.getValue('idBuyPeriodicity')}</span>
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
			data={periodicities}
			columns={columns}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			emptyMessage="No hay periodicidades registradas"
			actions={(periodicity) => (
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onEdit(periodicity)}
						className="h-8 w-8 p-0"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDelete(periodicity)}
						className="h-8 w-8 p-0 text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</>
			)}
		/>
	)
}
