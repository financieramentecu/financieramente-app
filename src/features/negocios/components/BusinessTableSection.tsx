'use client'

import React from 'react'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Button } from '@/features/shared/ui/button'
import { Business } from '@/features/negocios/types/business.types'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/features/shared/ui/avatar'
import { Badge } from '@/features/shared/ui/badge'
import { Plus, Pencil, Eye, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import type { ColumnDef } from '@tanstack/react-table'

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

	const columns: ColumnDef<Business>[] = [
		{
			accessorKey: 'id',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="# Negocio" />
			),
			cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
		},
		{
			accessorKey: 'clientName',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Cliente" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue('clientName')}</span>
			),
		},
		{
			accessorKey: 'identification',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Identificación" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue('identification')}</span>
			),
		},
		{
			accessorKey: 'user',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Agente" />
			),
			cell: ({ row }) => {
				const userData = row.original.user
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
			accessorKey: 'contract',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Contrato" />
			),
			cell: ({ row }) => {
				const value = row.getValue('contract') as string
				return (
					<span
						className={value === '-' ? 'text-muted-foreground' : 'font-medium'}
					>
						{value}
					</span>
				)
			},
		},
		{
			accessorKey: 'companyName',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Compañía" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue('companyName')}</span>
			),
		},
		{
			accessorKey: 'date',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fecha" />
			),
			cell: ({ row }) => formatDate(row.getValue('date')),
		},
		{
			accessorKey: 'product',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Producto" />
			),
			cell: ({ row }) => <span>{row.getValue('product')}</span>,
		},
		{
			accessorKey: 'value',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Valor" />
			),
			cell: ({ row }) => (
				<span className="font-medium text-right">
					{formatCurrency(row.original.value, row.original.currency.name)}
				</span>
			),
		},
		{
			accessorKey: 'status',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Estado" />
			),
			cell: ({ row }) => getStatusBadge(row.getValue('status')),
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
				manualPagination={true}
				currentPage={pagination?.page || 1}
				pageSize={pagination?.pageSize || 10}
				totalItems={pagination?.total || data.length}
				onPageChange={onPageChange}
				actions={(row) => {
					const isEditable = row.status === 'Venta Efectuado'
					const isCancelable =
						row.status === 'Venta Efectuado' || row.status === 'Emitido'

					return (
						<div className="flex items-center gap-1">
							{isEditable && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onEditBusiness(row)}
									className="h-8 w-8 p-1 cursor-pointer"
									title="Editar"
								>
									<Pencil className="h-4 w-4" />
								</Button>
							)}

							{onViewBusiness && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onViewBusiness(row)}
									className="h-8 w-8 p-1 cursor-pointer"
									title="Ver detalle"
								>
									<Eye className="h-4 w-4" />
								</Button>
							)}

							{onCancelBusiness && isCancelable && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onCancelBusiness(row)}
									className="h-8 w-8 p-1 text-destructive hover:text-destructive cursor-pointer"
									title="Cancelar negocio"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</div>
					)
				}}
			/>
		</div>
	)
}
