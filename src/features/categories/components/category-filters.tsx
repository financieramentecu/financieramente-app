'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/features/shared/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import {
	CATEGORY_TYPES,
	type CategoryFilters as CategoryFiltersType,
} from '@/features/categories/types/category.types'

interface CategoryFiltersProps {
	filters: CategoryFiltersType
	onFilterChange: (filters: CategoryFiltersType) => void
	isLoading?: boolean
}

export function CategoryFilters({
	filters,
	onFilterChange,
	isLoading = false,
}: CategoryFiltersProps) {
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onFilterChange({ ...filters, search: e.target.value })
	}

	const handleStatusChange = (value: string) => {
		onFilterChange({ ...filters, status: value === 'all' ? undefined : value })
	}

	const handleTypeChange = (value: string) => {
		onFilterChange({
			...filters,
			typeCategory: value === 'all' ? undefined : value,
		})
	}

	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div className="relative flex-1 max-w-sm">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar por código o nombre..."
					className="pl-8"
					value={filters.search || ''}
					onChange={handleSearchChange}
					disabled={isLoading}
				/>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{/* Type Filter */}
				<Select
					value={filters.typeCategory || 'all'}
					onValueChange={handleTypeChange}
					disabled={isLoading}
				>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los tipos</SelectItem>
						{CATEGORY_TYPES.map((type) => (
							<SelectItem key={type} value={type}>
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Status Filter */}
				<Select
					value={filters.status || 'all'}
					onValueChange={handleStatusChange}
					disabled={isLoading}
				>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Estado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los estados</SelectItem>
						<SelectItem value="active">Activo</SelectItem>
						<SelectItem value="inactive">Inactivo</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
