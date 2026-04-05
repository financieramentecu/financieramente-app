'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { Button } from '@/features/shared/ui/button'
import { ClientOrigin } from '../types/origins.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface ClientOriginsTableSectionProps {
	data: ClientOrigin[]
	onAddOrigin: () => void
	onGlobalSearch: (query: string) => void
	onEditOrigin: (origin: ClientOrigin) => void
	onDeleteOrigin: (origin: ClientOrigin) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
}

export function ClientOriginsTableSection({
	data,
	onAddOrigin,
	onGlobalSearch,
	onEditOrigin,
	onDeleteOrigin,
	pagination,
	onPageChange,
	isSearching = false,
}: ClientOriginsTableSectionProps) {
	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString('es-CO')
		} catch {
			return dateString
		}
	}

	const columns: ColumnDef<ClientOrigin>[] = [
		{
			accessorKey: 'idClientOrigin',
			header: 'ID',
			cell: ({ row }) => (
				<span className="font-medium">#{row.original.idClientOrigin}</span>
			),
		},
		{
			accessorKey: 'name',
			header: 'Nombre',
			cell: ({ row }) => (
				<span className="font-medium">{row.original.name}</span>
			),
		},
		{
			accessorKey: 'description',
			header: 'Descripción',
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.description || '-'}
				</span>
			),
		},
		{
			accessorKey: 'status',
			header: 'Estado',
			cell: ({ row }) => (
				<Badge
					variant={row.original.status ? 'success' : 'destructive'}
				>
					{row.original.status ? 'Activo' : 'Inactivo'}
				</Badge>
			),
		},
		{
			accessorKey: 'createdAt',
			header: 'Fecha Creación',
			cell: ({ row }) => formatDate(row.original.createdAt as unknown as string),
		},
		{
			accessorKey: 'updatedAt',
			header: 'Fecha Modificación',
			cell: ({ row }) => formatDate(row.original.updatedAt as unknown as string),
		},
	]

	return (
		<div className="space-y-4">
			{/* Table Header with Add Button */}
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Lista de Orígenes de Cliente</h3>
				<Button onClick={onAddOrigin} className="gap-2 cursor-pointer">
					<Plus className="h-4 w-4" />
					Nuevo Origen
				</Button>
			</div>

			{/* Data Table */}
			<DataTable
				columns={columns}
				data={data}
				searchable={true}
				onGlobalSearch={onGlobalSearch}
				loading={isSearching}
				searchPlaceholder="Buscar por nombre de origen..."
				manualPagination={!!pagination}
				currentPage={pagination?.page}
				pageSize={pagination?.pageSize}
				totalItems={pagination?.total}
				onPageChange={onPageChange}
				actions={(origin) => (
					<>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditOrigin(origin)}
							className="h-8 w-8 p-0 cursor-pointer"
							title="Editar"
						>
							<Pencil className="h-4 w-4" />
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDeleteOrigin(origin)}
							className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
							title="Eliminar"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</>
				)}
			/>
		</div>
	)
}

