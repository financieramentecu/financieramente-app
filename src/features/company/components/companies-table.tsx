'use client'

import React, { useMemo } from 'react'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Company } from '../types/company.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface CompaniesTableSectionProps {
	data: Company[]
	onAddCompany: () => void
	onGlobalSearch: (query: string) => void
	onEditCompany: (company: Company) => void
	onDeleteCompany: (company: Company) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
}

export function CompaniesTableSection({
	data,
	onAddCompany,
	onGlobalSearch,
	onEditCompany,
	onDeleteCompany,
	pagination,
	onPageChange,
	isSearching = false,
}: CompaniesTableSectionProps) {
	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString('es-CO')
		} catch {
			return dateString
		}
	}

	const columns = useMemo<ColumnDef<Company>[]>(
		() => [
			{
				accessorKey: 'idCompany',
				header: '# Empresa',
				cell: ({ row }) => (
					<span className="font-medium">#{row.original.idCompany}</span>
				),
			},
			{
				accessorKey: 'name',
				header: 'Nombre de la Compañia',
				cell: ({ row }) => (
					<span className="font-medium">{row.original.name}</span>
				),
			},
			{
				accessorKey: 'status',
				header: 'Estado',
				cell: ({ row }) => (
					<Badge variant={row.original.status ? 'success' : 'destructive'}>
						{row.original.status ? 'Activa' : 'Inactiva'}
					</Badge>
				),
			},
			{
				accessorKey: 'currency',
				header: 'Moneda',
				cell: ({ row }) => {
					const currency = row.original.currency
					if (!currency) return <span className="text-muted-foreground">-</span>
					return (
						<Badge variant="outline" className="font-normal capitalize">
							{currency.name} ({currency.symbol})
						</Badge>
					)
				},
			},
			{
				accessorKey: 'createdAt',
				header: 'Fecha de Registro',
				cell: ({ row }) => formatDate(row.original.createdAt as string),
			},
		],
		[]
	)

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Lista de Compañias</h3>
				<Button onClick={onAddCompany} className="gap-2 cursor-pointer">
					<Plus className="h-4 w-4" />
					Nueva Empresa
				</Button>
			</div>

			<DataTable
				columns={columns}
				data={data}
				searchable={true}
				onGlobalSearch={onGlobalSearch}
				loading={isSearching}
				searchPlaceholder="Buscar por nombre de empresa..."
				manualPagination={!!pagination}
				currentPage={pagination?.page}
				pageSize={pagination?.pageSize}
				totalItems={pagination?.total}
				onPageChange={onPageChange}
				actions={(company) => (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditCompany(company)}
							className="h-8 w-8 p-0 cursor-pointer"
							title="Editar"
						>
							<Pencil className="h-4 w-4" />
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDeleteCompany(company)}
							className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
							title="Eliminar"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				)}
			/>
		</div>
	)
}
