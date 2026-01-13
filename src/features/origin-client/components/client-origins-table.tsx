'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { ClientOrigin } from '../types/client-origin.types'
import { DataTableColumn } from '@/features/shared/ui/types/dashboard.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'

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
		return new Date(dateString).toLocaleDateString('es-CO')
	}

	const getStatusBadge = (status: boolean) => {
		if (status) {
			return (
				<Badge
					variant="default"
					className="bg-emerald-100 text-emerald-800 border-emerald-200"
				>
					Activo
				</Badge>
			)
		}

		return (
			<Badge
				variant="default"
				className="bg-red-100 text-red-800 border-red-200"
			>
				Inactivo
			</Badge>
		)
	}

	const columns: DataTableColumn<ClientOrigin>[] = [
		{
			key: 'idClientOrigin',
			header: 'ID',
			cellRenderer: (_value, row) => (
				<span className="font-medium">#{row.idClientOrigin}</span>
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
			key: 'description',
			header: 'Descripción',
			cellRenderer: (value) => (
				<span className="text-muted-foreground">
					{value ? (value as string) : '-'}
				</span>
			),
		},
		{
			key: 'status',
			header: 'Estado',
			cellRenderer: (value) => getStatusBadge(value as boolean),
		},
		{
			key: 'createdAt',
			header: 'Fecha Creación',
			cellRenderer: (value) => formatDate(value as string),
		},
		{
			key: 'updatedAt',
			header: 'Fecha Modificación',
			cellRenderer: (value) => formatDate(value as string),
		},
		{
			key: 'actions',
			header: 'Acciones',
			cellRenderer: (_, row) => {
				return (
					<div className="flex items-center gap-1">
						{/* Editar */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditOrigin(row)}
							className="h-8 w-8 p-0 cursor-pointer"
							title="Editar"
						>
							<Pencil className="h-4 w-4" />
						</Button>

						{/* Eliminar */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDeleteOrigin(row)}
							className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
							title="Eliminar"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				)
			},
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
				pagination={
					pagination
						? {
								currentPage: pagination.page,
								pageSize: pagination.pageSize,
								totalItems: pagination.total,
								onPageChange: onPageChange || (() => {}),
							}
						: {
								currentPage: 1,
								pageSize: 10,
								totalItems: data.length,
								onPageChange: () => {},
							}
				}
			/>
		</div>
	)
}

