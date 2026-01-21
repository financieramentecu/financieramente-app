'use client'

import React, { useState } from 'react'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Search } from 'lucide-react'
import { BusinessSearchParams } from '@/features/negocios/types/business.types'

interface BusinessSearchFormProps {
	onSearch: (params: BusinessSearchParams) => void
	onShowAll: () => void
}

export function BusinessSearchForm({
	onSearch,
	onShowAll,
}: BusinessSearchFormProps) {
	const [searchType, setSearchType] = useState<'agent' | 'client' | 'id'>(
		'agent'
	)
	const [searchCriteria, setSearchCriteria] = useState('')

	const handleSearch = () => {
		onSearch({
			searchType,
			searchCriteria,
		})
	}

	const handleShowAll = () => {
		setSearchCriteria('')
		onShowAll()
	}

	return (
		<div className="space-y-4 p-6 border rounded-lg bg-card">
			<div className="space-y-4">
				<div>
					<Label className="text-base font-medium">Tipo de Búsqueda</Label>
					<Select
						value={searchType}
						onValueChange={(value) =>
							setSearchType(value as 'agent' | 'client' | 'id')
						}
					>
						<SelectTrigger className="mt-2">
							<SelectValue placeholder="Selecciona el tipo de búsqueda" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="agent">Nombre del agente</SelectItem>
							<SelectItem value="client">Nombre del cliente</SelectItem>
							<SelectItem value="id">Cédula del cliente</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label htmlFor="search-criteria" className="text-base font-medium">
						Criterio de Búsqueda
					</Label>
					<Input
						id="search-criteria"
						placeholder="Ej: María López"
						value={searchCriteria}
						onChange={(e) => setSearchCriteria(e.target.value)}
						className="mt-2"
					/>
				</div>

				<div className="flex gap-3">
					<Button
						onClick={handleSearch}
						disabled={!searchCriteria.trim()}
						className="cursor-pointer"
					>
						<Search className="h-4 w-4 mr-2" />
						Buscar
					</Button>
					<Button
						variant="outline"
						onClick={handleShowAll}
						className="cursor-pointer"
					>
						Mostrar todos
					</Button>
				</div>
			</div>
		</div>
	)
}
