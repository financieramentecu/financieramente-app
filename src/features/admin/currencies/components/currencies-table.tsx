'use client'

import {
	CrudTable,
	type CrudTableColumn,
} from '@/features/admin/shared/CrudTable'
import { Badge } from '@/features/shared/ui/badge'
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
	const columns: CrudTableColumn<Currency>[] = [
		{
			key: 'idCurrency',
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
			key: 'symbol',
			header: 'Símbolo',
			cellRenderer: (value) => (
				<span className="text-sm">{value ? String(value) : '-'}</span>
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
			data={currencies}
			columns={columns}
			onEdit={onEdit}
			onDelete={onDelete}
			isLoading={isLoading}
			searchable={true}
			emptyMessage="No hay monedas registradas"
		/>
	)
}
