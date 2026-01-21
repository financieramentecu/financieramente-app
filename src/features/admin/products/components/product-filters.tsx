'use client'

import { Input } from '@/features/shared/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import type { ProductFilters, CompanyOption } from '../types/product.types'

interface ProductFiltersProps {
	filters: ProductFilters
	companies: CompanyOption[]
	onFiltersChange: (filters: ProductFilters) => void
}

export function ProductFilters({
	filters,
	companies,
	onFiltersChange,
}: ProductFiltersProps) {
	return (
		<div className="flex flex-col md:flex-row gap-3 md:items-center">
			<Input
				placeholder="Buscar por nombre o descripción..."
				value={filters.search || ''}
				onChange={(event) =>
					onFiltersChange({ ...filters, search: event.target.value })
				}
				className="md:w-1/3"
			/>
			<Select
				value={filters.companyId || 'all'}
				onValueChange={(value) =>
					onFiltersChange({ ...filters, companyId: value })
				}
			>
				<SelectTrigger className="md:w-64">
					<SelectValue placeholder="Filtrar por compañía" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todas las compañías</SelectItem>
					{companies.map((company) => (
						<SelectItem
							key={company.idCompany}
							value={company.idCompany.toString()}
						>
							{company.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
