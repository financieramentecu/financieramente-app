'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Button } from '@/features/shared/ui/button'
import { Business } from '@/features/negocios/types/business.types'
import { DataTableColumn } from '@/features/shared/ui/types/dashboard.types'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/features/shared/ui/avatar'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Eye, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface BusinessTableSectionProps {
	data: Business[]
	onAddBusiness: () => void
	onGlobalSearch: (query: string) => void
	onEditBusiness: (business: Business) => void
	onViewBusiness?: (business: Business) => void
	onCancelBusiness?: (business: Business) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
}

export function BusinessTableSection({
	data,
	onAddBusiness,
	onGlobalSearch,
	onEditBusiness,
	onViewBusiness,
	onCancelBusiness,
	pagination,
	onPageChange,
	isSearching = false,
}: BusinessTableSectionProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-CO')
	}

	const getStatusBadge = (status: string) => {
		if (status === 'Venta Efectuado') {
			return (
				<Badge
					variant="default"
					className="bg-orange-100 text-orange-800 border-orange-200"
				>
					{status}
				</Badge>
			)
		}

		if (status === 'Emitido') {
			return (
				<Badge
					variant="default"
					className="bg-emerald-100 text-emerald-800 border-emerald-200"
				>
					{status}
				</Badge>
			)
		}

		if (status === 'Cancelado') {
			return (
				<Badge
					variant="default"
					className="bg-red-100 text-red-800 border-red-200"
				>
					{status}
				</Badge>
			)
		}

		// Fallback para estados desconocidos
		return (
			<Badge
				variant="secondary"
				className="bg-secondary/10 text-secondary-foreground border-secondary/20"
			>
				{status}
			</Badge>
		)
	}

	const columns: DataTableColumn<Business>[] = [
		{
			key: 'id',
			header: '# Negocio',
			cellRenderer: (_value, row) => (
				<span className="font-medium">#{row.id}</span>
			),
		},
		{
			key: 'clientName',
			header: 'Cliente',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'identification',
			header: 'Identificación',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'user',
			header: 'Agente',
			cellRenderer: (user) => {
				const userData = user as Business['user']
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarImage src={userData.avatar} alt={userData.name} />
							<AvatarFallback>
								{userData.name
									.split(' ')
									.map((n: string) => n[0])
									.join('')}
							</AvatarFallback>
						</Avatar>
						<span className="font-medium">{userData.name}</span>
					</div>
				)
			},
		},
		{
			key: 'contract',
			header: 'Contrato',
			cellRenderer: (value) => (
				<span
					className={value === '-' ? 'text-muted-foreground' : 'font-medium'}
				>
					{value as string}
				</span>
			),
		},
		{
			key: 'companyName',
			header: 'Compañía',
			cellRenderer: (value) => (
				<span className="font-medium">{value as string}</span>
			),
		},
		{
			key: 'date',
			header: 'Fecha',
			cellRenderer: (value) => formatDate(value as string),
		},
		{
			key: 'product',
			header: 'Producto',
			cellRenderer: (value) => <span>{value as string}</span>,
		},
		{
			key: 'value',
			header: 'Valor',
			cellRenderer: (value, row) => (
				<span className="font-medium">
					{formatCurrency(value as number, row.currency.name)}
				</span>
			),
		},
		{
			key: 'status',
			header: 'Estado',
			cellRenderer: (value) => getStatusBadge(value as string),
		},
		{
			key: 'actions',
			header: 'Acciones',
			cellRenderer: (_, row) => {
				const isEditable = row.status === 'Venta Efectuado'
				const isCancelable =
					row.status === 'Venta Efectuado' || row.status === 'Emitido'

				return (
					<div className="flex items-center gap-1">
						{/* Editar - solo para Venta Efectuada */}
						{isEditable && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onEditBusiness(row)}
								className="h-8 w-8 p-0 cursor-pointer"
								title="Editar"
							>
								<Pencil className="h-4 w-4" />
							</Button>
						)}

						{/* Ver - siempre visible */}
						{onViewBusiness && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onViewBusiness(row)}
								className="h-8 w-8 p-0 cursor-pointer"
								title="Ver detalle"
							>
								<Eye className="h-4 w-4" />
							</Button>
						)}

						{/* Cancelar - solo para Venta Efectuada o Emitido */}
						{onCancelBusiness && isCancelable && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onCancelBusiness(row)}
								className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
								title="Cancelar negocio"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				)
			},
		},
	]

	return (
		<div className="space-y-4">
			{/* Table Header with Add Button */}
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Lista de Negocios</h3>
				<Button onClick={onAddBusiness} className="gap-2 cursor-pointer">
					<Plus className="h-4 w-4" />
					Agregar negocio
				</Button>
			</div>

			{/* Data Table */}
			<DataTable
				columns={columns}
				data={data}
				searchable={true}
				onGlobalSearch={onGlobalSearch}
				loading={isSearching}
				searchPlaceholder="Buscar por cédula, nombre, email, # negocio o contrato..."
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
