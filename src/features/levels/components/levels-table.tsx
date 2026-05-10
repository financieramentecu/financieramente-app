'use client'

import React, { useMemo } from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import {
	Level,
	SYSTEM_LEVEL_TYPE_NAME,
} from '../types/level.types'
import { useCategoryTypes } from '@/features/category-types/hooks/use-category-types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { ColumnDef } from '@tanstack/react-table'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface LevelsTableSectionProps {
	data: Level[]
	onAddLevel: () => void
	onGlobalSearch: (query: string) => void
	onEditLevel: (level: Level) => void
	onDeleteLevel: (level: Level) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
	selectedTypeLevel?: string
	onTypeLevelChange?: (value: string) => void
}

export function LevelsTableSection({
	data,
	onAddLevel,
	onGlobalSearch,
	onEditLevel,
	onDeleteLevel,
	pagination,
	onPageChange,
	isSearching = false,
	selectedTypeLevel,
	onTypeLevelChange,
}: LevelsTableSectionProps) {
	const { data: typesData } = useCategoryTypes()
	const levelTypeOptions = typesData?.categoryTypes ?? []

	const columns = useMemo<ColumnDef<Level>[]>(
		() => [
			{
				accessorKey: 'code',
				header: 'Código',
				cell: ({ row }) => (
					<span className="font-mono text-sm">{row.original.code}</span>
				),
			},
			{
				accessorKey: 'name',
				header: 'Nombre',
			},
			{
				accessorKey: 'color',
				header: 'Color',
				cell: ({ row }) => (
					<span
						data-testid="color-chip"
						className="inline-block h-5 w-5 rounded-full border border-border"
						style={{ backgroundColor: row.original.color }}
						title={row.original.color}
					/>
				),
			},
			{
				accessorKey: 'nextLevel',
				header: 'Siguiente',
				cell: ({ row }) => {
					const next = row.original.nextLevel
					if (!next) return <span className="text-muted-foreground">—</span>
					return <span className="text-sm">{next.name}</span>
				},
			},
			{
				accessorKey: 'typeLevel',
				header: 'Tipo',
				cell: ({ row }) => (
					<Badge variant="outline">
						{row.original.typeLevel}
					</Badge>
				),
			},
			{
				accessorKey: 'beneficiaryMode',
				header: 'Beneficiario',
				cell: ({ row }) => {
					const isFixed =
						row.original.beneficiaryMode === 'BENEFICIARIO_GENERAL'
					const isSystemType =
						row.original.typeLevel === SYSTEM_LEVEL_TYPE_NAME
					return (
						<div className="flex flex-col gap-0.5">
							<Badge
								variant={isFixed ? 'outline' : 'secondary'}
								className="w-fit text-xs"
							>
								{isFixed ? 'Beneficiario general' : 'Override'}
							</Badge>
							{isSystemType && isFixed && row.original.fixedBeneficiaryUser ? (
								<span className="text-xs text-muted-foreground">
									{row.original.fixedBeneficiaryUser.name}{' '}
									{row.original.fixedBeneficiaryUser.lastName}
								</span>
							) : null}
						</div>
					)
				},
			},
			{
				accessorKey: 'descripcion',
				header: 'Descripción',
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm truncate max-w-xs block">
						{row.original.descripcion || '-'}
					</span>
				),
			},
			{
				accessorKey: 'status',
				header: 'Estado',
				cell: ({ row }) => (
					<Badge variant={row.original.status ? 'success' : 'destructive'}>
						{row.original.status ? 'Activo' : 'Inactivo'}
					</Badge>
				),
			},
			{
				accessorKey: 'createdAt',
				header: 'Fecha Creación',
				cell: ({ row }) => {
					const value = row.original.createdAt
					if (!value) return '-'
					const date = new Date(String(value))
					return date.toLocaleDateString('es-CO', {
						year: 'numeric',
						month: 'short',
						day: 'numeric',
					})
				},
			},
		],
		[]
	)

	const renderAdditionalFilters = () => {
		if (!onTypeLevelChange) return null
		return (
			<Select
				value={selectedTypeLevel || 'all'}
				onValueChange={onTypeLevelChange}
			>
				<SelectTrigger className="w-full sm:w-[180px] min-w-0">
					<SelectValue placeholder="Filtrar por tipo" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todos los tipos</SelectItem>
					{levelTypeOptions.map((type) => (
						<SelectItem key={type.id} value={type.name}>
							{type.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<h2 className="text-xl font-semibold">
					Niveles (Jerarquía de usuarios)
				</h2>
				<Button onClick={onAddLevel} className="cursor-pointer">
					<Plus className="h-4 w-4 mr-2" />
					Crear Nivel (Jerarquía)
				</Button>
			</div>

			{/* Table */}
			<DataTable
				data={data}
				columns={columns}
				onGlobalSearch={onGlobalSearch}
				searchPlaceholder="Buscar por código o nombre..."
				manualPagination={!!pagination}
				currentPage={pagination?.page}
				pageSize={pagination?.pageSize}
				totalItems={pagination?.total}
				onPageChange={onPageChange}
				searchable
				loading={isSearching}
				renderAdditionalFilters={renderAdditionalFilters}
				actions={(level) => (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onEditLevel(level)}
							title="Editar nivel"
							className="cursor-pointer"
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onDeleteLevel(level)}
							title="Eliminar nivel"
							className="text-destructive hover:text-destructive cursor-pointer"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				)}
			/>
		</div>
	)
}
