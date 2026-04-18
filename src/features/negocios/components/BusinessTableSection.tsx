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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Plus, Pencil, Eye, Trash2, Coins } from 'lucide-react'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { UserRole, canEditContractWhenBusinessEmitido } from '@/features/auth/lib/roles'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'
import { FONDEAR_ACTION_TOOLTIP } from '@/features/negocios/lib/fondear-action-copy'
import {
	BUSINESS_STATUS,
	type BusinessStatus,
} from '@/features/negocios/types/business-entity.types'
import { cn } from '@/lib/utils'

/** Valor sentinela del Select para “todos los estados” (Radix no admite value vacío). */
const LIST_STATUS_FILTER_ALL = '__all__'

const LIST_STATUS_OPTIONS: { value: BusinessStatus; label: string }[] = [
	{ value: BUSINESS_STATUS.VENTA_EFECTUADA, label: 'Venta efectuada' },
	{ value: BUSINESS_STATUS.EMITIDO, label: 'Emitido' },
	{ value: BUSINESS_STATUS.COMISIONANDO, label: 'Comisionando' },
	{ value: BUSINESS_STATUS.CANCELADO, label: 'Cancelado' },
	{ value: BUSINESS_STATUS.FONDEADO, label: 'Fondeado' },
]

/** Celda compacta para iconos en toolbar de acciones (sin saltos entre filas). */
const ACTION_ICON_BTN =
	'inline-flex size-9 shrink-0 items-center justify-center rounded-md cursor-pointer'

interface PaginationData {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface BusinessTableSectionProps {
	data: Business[]
	onAddBusiness: () => void
	onGlobalSearch?: (query: string) => void
	onEditBusiness: (business: Business) => void
	onViewBusiness?: (business: Business) => void
	onCancelBusiness?: (business: Business) => void
	onFondearBusiness?: (business: Business) => void
	pagination?: PaginationData
	onPageChange?: (page: number) => void
	isSearching?: boolean
	/** Used to show edit on Emitido only for roles allowed by API */
	userRole?: UserRole
	/** Filtro por estado en la lista (`undefined` = todos) */
	listStatus?: BusinessStatus
	onListStatusChange?: (status: BusinessStatus | undefined) => void
}

export function BusinessTableSection({
	data,
	onAddBusiness,
	onGlobalSearch,
	onEditBusiness,
	onViewBusiness,
	onCancelBusiness,
	onFondearBusiness,
	pagination,
	onPageChange,
	isSearching = false,
	userRole,
	listStatus,
	onListStatusChange,
}: BusinessTableSectionProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-CO')
	}

	const getStatusBadge = (status: string) => {
		if (status === 'Venta Efectuado') {
			return (
				<Badge
					variant="default"
					className="bg-orange-100 text-orange-800 border-orange-200 truncate"
				>
					{status}
				</Badge>
			)
		}

		if (status === 'Emitido') {
			return (
				<Badge
					variant="default"
					className="bg-emerald-100 text-emerald-800 border-emerald-200 truncate"
				>
					{status}
				</Badge>
			)
		}

		if (status === 'Comisionando') {
			return (
				<Badge
					variant="default"
					className="bg-blue-100 text-blue-800 border-blue-200 truncate"
				>
					{status}
				</Badge>
			)
		}

		if (status === 'Cancelado') {
			return (
				<Badge
					variant="default"
					className="bg-red-100 text-red-800 border-red-200 truncate"
				>
					{status}
				</Badge>
			)
		}

		if (status === 'Fondeado') {
			return (
				<Badge
					variant="default"
					className="bg-indigo-100 text-indigo-800 border-indigo-200 truncate"
				>
					{status}
				</Badge>
			)
		}

		// Fallback para estados desconocidos
		return (
			<Badge
				variant="secondary"
				className="bg-secondary/10 text-secondary-foreground border-secondary/20 truncate"
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
			cell: ({ row }) => (
				<span className="font-medium">#{row.original.id}</span>
			),
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
			<TooltipProvider>
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
					renderAdditionalFilters={
						onListStatusChange
							? () => (
									<Select
										value={listStatus ?? LIST_STATUS_FILTER_ALL}
										onValueChange={(v) =>
											onListStatusChange(
												v === LIST_STATUS_FILTER_ALL
													? undefined
													: (v as BusinessStatus)
											)
										}
									>
										<SelectTrigger
											className="h-8 w-[140px] lg:w-[170px]"
											aria-label="Filtrar por estado del negocio"
										>
											<SelectValue placeholder="Estado" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={LIST_STATUS_FILTER_ALL}>
												Todos los estados
											</SelectItem>
											{LIST_STATUS_OPTIONS.map(({ value, label }) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)
							: undefined
					}
					actions={(row) => {
						const isVentaEfectuado = row.status === 'Venta Efectuado'
						const isEmitido = row.status === 'Emitido'
						const canEditEmitido =
							isEmitido &&
							userRole !== undefined &&
							canEditContractWhenBusinessEmitido(userRole)
						const isEditable = isVentaEfectuado || canEditEmitido
						const isCancelable =
							row.status === 'Venta Efectuado' || row.status === 'Emitido'
						const canFondearRole =
							userRole === UserRole.ADMIN ||
							userRole === UserRole.ASISTENTE_GERENCIA_OPERATIVA ||
							userRole === UserRole.AGENTE
						const isFondeable =
							isEmitido && !row.hasAnnualPayments && canFondearRole

						return (
							<div
								role="toolbar"
								aria-label="Acciones del negocio"
								className="inline-flex max-w-full flex-nowrap items-center gap-1"
							>
								{isEditable && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => onEditBusiness(row)}
										className={ACTION_ICON_BTN}
										title="Editar"
									>
										<Pencil className="h-4 w-4" />
									</Button>
								)}

								{onViewBusiness && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => onViewBusiness(row)}
										className={ACTION_ICON_BTN}
										title="Ver detalle"
									>
										<Eye className="h-4 w-4" />
									</Button>
								)}

								{onFondearBusiness && isFondeable && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onFondearBusiness(row)}
												className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
											>
												<Coins className="h-4 w-4 shrink-0" aria-hidden />
												<span className="text-xs font-medium whitespace-nowrap">
													Fondear
												</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent side="top" className="max-w-xs">
											<p>{FONDEAR_ACTION_TOOLTIP}</p>
										</TooltipContent>
									</Tooltip>
								)}

								{onCancelBusiness && isCancelable && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => onCancelBusiness(row)}
										className={cn(
											ACTION_ICON_BTN,
											'text-destructive hover:text-destructive'
										)}
										title="Cancelar negocio"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						)
					}}
				/>
			</TooltipProvider>
		</div>
	)
}
