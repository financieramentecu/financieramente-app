'use client'

import { DataTable, DataTableColumnHeader } from '@/features/shared/ui/DataTable'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Level } from '@/features/levels/types/level.types'

interface LevelsTableProps {
	levels: Level[]
	isLoading: boolean
	onEdit: (level: Level) => void
	onDelete: (level: Level) => void
}

const LEVEL_LABELS: Record<string, string> = {
	MMS: 'MMS',
	ALIADO: 'Aliado',
	TRINITY: 'Trinity',
}

export function AdminLevelsTable({
	levels,
	isLoading,
	onEdit,
	onDelete,
}: LevelsTableProps) {
	const columns: ColumnDef<Level>[] = [
		{
			accessorKey: 'idLevel',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="ID" />
			),
			cell: ({ row }) => (
				<span className="font-medium">#{row.getValue('idLevel')}</span>
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
			accessorKey: 'typeLevel',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Tipo" />
			),
			cell: ({ row }) => {
				const value = row.getValue('typeLevel') as string
				return <span className="text-sm">{LEVEL_LABELS[value] ?? value}</span>
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
			data={levels}
			columns={columns}
			loading={isLoading}
			searchable={true}
			searchColumn="name"
			emptyMessage="No hay niveles registrados"
			actions={(level) => (
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onEdit(level)}
						className="h-8 w-8 p-0"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDelete(level)}
						className="h-8 w-8 p-0 text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</>
			)}
		/>
	)
}
