'use client'

import {
	CrudTable,
	type CrudTableColumn,
} from '@/features/admin/shared/CrudTable'
import { Badge } from '@/features/shared/ui/badge'
import type { Company } from '../types/company.types'

interface CompaniesTableProps {
	companies: Company[]
	isLoading: boolean
	onEdit: (company: Company) => void
	onDelete: (company: Company) => void
}

export function CompaniesTable({
	companies,
	isLoading,
	onEdit,
	onDelete,
}: CompaniesTableProps) {
	const columns: CrudTableColumn<Company>[] = [
		{
			key: 'idCompany',
			header: 'ID',
			cellRenderer: (value) => (
				<span className="font-medium">#{String(value)}</span>
			),
		},
		{
			key: 'name',
			header: 'Nombre',
			cellRenderer: (value) => (
				<span className="font-medium">{String(value)}</span>
			),
		},
		{
			key: 'idTypeCompany',
			header: 'Tipo',
			cellRenderer: (value) => (
				<span className="text-sm">
					{value === 'NACIONAL' ? 'Nacional' : 'Internacional'}
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
			data={companies}
			columns={columns}
			onEdit={onEdit}
			onDelete={onDelete}
			isLoading={isLoading}
			searchable={true}
			emptyMessage="No hay compañías registradas"
		/>
	)
}
