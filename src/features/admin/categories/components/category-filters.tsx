'use client'

import { Input } from '@/features/shared/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import type { CategoryFilters } from '../types/category.types'

interface CategoryFiltersProps {
	filters: CategoryFilters
	onFiltersChange: (filters: CategoryFilters) => void
}

export function CategoryFilters({
	filters,
	onFiltersChange,
}: CategoryFiltersProps) {
	return (
		<div className="flex flex-col md:flex-row gap-3 md:items-center">
			<Input
				placeholder="Buscar por código o nombre..."
				value={filters.search || ''}
				onChange={(event) =>
					onFiltersChange({ ...filters, search: event.target.value })
				}
				className="md:w-1/3"
			/>
			<Select
				value={filters.type || 'all'}
				onValueChange={(value) =>
					onFiltersChange({
						...filters,
						type: value === 'all' ? undefined : value,
					})
				}
			>
				<SelectTrigger className="md:w-64">
					<SelectValue placeholder="Filtrar por tipo" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todos los tipos</SelectItem>
					<SelectItem value="MMS">MMS</SelectItem>
					<SelectItem value="ALIADO">Aliado</SelectItem>
					<SelectItem value="TRINITY">Trinity</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
