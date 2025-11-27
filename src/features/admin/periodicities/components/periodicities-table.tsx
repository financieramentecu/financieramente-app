'use client'

import {
	CrudTable,
	type CrudTableColumn,
} from '@/features/admin/shared/CrudTable'
import { Badge } from '@/features/shared/ui/badge'
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
	const columns: CrudTableColumn<Periodicity>[] = [
		{
			key: 'idBuyPeriodicity',
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
			key: 'active',
			header: 'Estado',
			cellRenderer: (value) => (
				<Badge variant={(value as boolean) ? 'success' : 'neutral'}>
					{(value as boolean) ? 'Activa' : 'Inactiva'}
				</Badge>
			),
		},
	]

	return (
		<CrudTable
			data={periodicities}
			columns={columns}
			onEdit={onEdit}
			onDelete={onDelete}
			isLoading={isLoading}
			searchable={true}
			emptyMessage="No hay periodicidades registradas"
		/>
	)
}
