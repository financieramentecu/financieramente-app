'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Company } from '../types/company.types'
import { DataTableColumn } from '@/features/shared/ui/types/dashboard.types'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'

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
		return new Date(dateString).toLocaleDateString('es-CO')
	}

	const getStatusBadge = (status: boolean) => {
		if (status) {
			return (
				<Badge
					variant="default"
					className="bg-emerald-100 text-emerald-800 border-emerald-200"
				>
					Activa
				</Badge>
			)
		}

		return (
			<Badge
				variant="default"
				className="bg-red-100 text-red-800 border-red-200"
			>
				Inactiva
			</Badge>
		)
	}

	const columns: DataTableColumn<Company>[] = [
		{
			key: 'idCompany',
			header: '# Empresa',
			cellRenderer: (_value, row) => (
				<span className="font-medium">#{row.idCompany}</span>
			),
		},
		{
			key: 'name',
			header: 'Nombre Completo de la Agencia',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'status',
			header: 'Estado',
			cellRenderer: (value) => getStatusBadge(value as boolean),
		},
		{
			key: 'createdAt',
			header: 'Fecha de Registro',
			cellRenderer: (value) => formatDate(value as string),
		},
		{
			key: 'actions',
			header: 'Acciones',
			cellRenderer: (_, row) => {
				return (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditCompany(row)}
							className="h-8 w-8 p-0 cursor-pointer"
							title="Editar"
						>
							<Pencil className="h-4 w-4" />
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDeleteCompany(row)}
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
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Lista de Empresas</h3>
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
