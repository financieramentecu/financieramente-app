'use client'

import React, { useMemo } from 'react'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Button } from '@/features/shared/ui/button'
import { Business } from '@/features/negocios/types/business.types'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/features/shared/ui/avatar'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import {
	Plus,
	Pencil,
	Eye,
	Trash2,
	Coins,
	Download,
	CalendarRange,
} from 'lucide-react'
import { Input } from '@/features/shared/ui/input'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { UserRole, canEditContractWhenBusinessEmitido, canFundPayments } from '@/features/auth/lib/roles'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'
import {
	FONDEAR_ACTION_TOOLTIP,
	FONDEAR_ANNUAL_ACTION_TOOLTIP,
	FONDEAR_ANNUAL_LABEL,
} from '@/features/negocios/lib/fondear-action-copy'
import {
	BUSINESS_STATUS,
	type BusinessStatus,
} from '@/features/negocios/types/business-entity.types'
import { BusinessStatusBadge } from '@/features/negocios/components/ui/BusinessStatusBadge'
import { cn } from '@/lib/utils'

/** Valor sentinela del Select para “todos los estados” (Radix no admite value vacío). */
const LIST_STATUS_FILTER_ALL = '__all__'

const LIST_STATUS_OPTIONS: { value: BusinessStatus; label: string }[] = [
	{ value: BUSINESS_STATUS.VENTA_EFECTUADA, label: 'Venta efectuada' },
	{ value: BUSINESS_STATUS.EMITIDO, label: 'Emitido' },
	{ value: BUSINESS_STATUS.LIQUIDADO, label: 'Liquidado' },
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
	/** Filtro por nombre de Money Strategist */
	agentName?: string
	onAgentNameChange?: (value: string) => void
	/** YYYY-MM-DD — filtro por `date_anchored` del negocio */
	fundDateFrom?: string
	fundDateTo?: string
	onFundDateFromChange?: (value: string) => void
	onFundDateToChange?: (value: string) => void
	fundDateRangeActive?: boolean
	canExportExcel?: boolean
	onExportExcel?: () => void
	isExportingExcel?: boolean
	exportExcelError?: string | null
	/** Callback de sorting server-side */
	onSortingChange?: (sortBy: string | undefined, sortOrder: 'asc' | 'desc') => void
	/** Columna actual de ordenamiento */
	sortBy?: string
	/** Dirección del ordenamiento */
	sortOrder?: 'asc' | 'desc'
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
	agentName = '',
	onAgentNameChange,
	fundDateFrom = '',
	fundDateTo = '',
	onFundDateFromChange,
	onFundDateToChange,
	fundDateRangeActive = false,
	canExportExcel = false,
	onExportExcel,
	isExportingExcel = false,
	exportExcelError = null,
	onSortingChange,
	sortBy,
	sortOrder,
}: BusinessTableSectionProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-CO')
	}

	const formatOptionalDate = (iso: string | null | undefined) => {
		if (!iso) {
			return '—'
		}
		return formatDate(iso)
	}

	const columns: ColumnDef<Business>[] = [
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
			accessorKey: 'contract',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Contrato" />
			),
			enableSorting: true,
		},
		{
			accessorKey: 'status',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Estado" />
			),
			cell: ({ row }) => (
				<BusinessStatusBadge status={row.original.statusCode} />
			),
			enableSorting: true,
		},
		{
			id: 'user',
			accessorFn: (row) => row.user?.name ?? '',
			size: 220,
			minSize: 180,
			enableSorting: true,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Money Strategist" />
			),
			cell: ({ row }) => {
				const userData = row.original.user
				return (
					<div className="flex min-w-0 items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarImage src={userData.avatar} alt={userData.name} />
							<AvatarFallback className="bg-[#11525B]/18 text-[#11525B] ring-1 ring-[#11525B]/35 text-[11px] font-semibold">
								{userData.name
									.split(' ')
									.map((n: string) => n[0])
									.join('')}
							</AvatarFallback>
						</Avatar>
						<span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis text-[#11525B]">
							{userData.name}
						</span>
					</div>
				)
			},
		},
		{
			id: 'agentCategory',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Categoría Money Strategist" />
			),
			cell: ({ row }) => (
				<span className={row.original.user.categoryName ? '' : 'text-muted-foreground'}>
					{row.original.user.categoryName ?? '—'}
				</span>
			),
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
			accessorKey: 'product',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Producto" />
			),
			cell: ({ row }) => <span>{row.getValue('product')}</span>,
		},
		{
			accessorKey: 'clientOriginName',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Origen" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.original.clientOriginName}</span>
			),
		},
		{
			accessorKey: 'term',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Plazo" />
			),
			cell: ({ row }) => {
				const t = row.original.term
				return (
					<span className={t != null ? '' : 'text-muted-foreground'}>
						{t != null ? String(t) : '—'}
					</span>
				)
			},
		},
		{
			accessorKey: 'periodicityName',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Periodicidad" />
			),
			cell: ({ row }) => {
				const name = row.original.periodicityName
				return (
					<span className={name ? '' : 'text-muted-foreground'}>
						{name ?? '—'}
					</span>
				)
			},
		},
		{
			accessorKey: 'value',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Valor" />
			),
			cell: ({ row }) => (
				<span className="font-medium text-[#11525B]">
					{formatCurrency(row.original.value, row.original.currency.name)}
				</span>
			),
			enableSorting: true,
		},
		{
			accessorKey: 'dateIssued',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fecha emisión" />
			),
			cell: ({ row }) => (
				<span
					className={
						row.original.dateIssued ? '' : 'text-muted-foreground'
					}
				>
					{formatOptionalDate(row.original.dateIssued)}
				</span>
			),
		},
		{
			accessorKey: 'dateAnchored',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fecha fondeo" />
			),
			cell: ({ row }) => (
				<span
					className={
						row.original.dateAnchored ? '' : 'text-muted-foreground'
					}
				>
					{formatOptionalDate(row.original.dateAnchored)}
				</span>
			),
		},
		{
			accessorKey: 'date',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fecha creación" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-xs">
					{formatDate(row.original.date)}
				</span>
			),
			enableSorting: true,
		},
	]

	const initialSorting = useMemo<SortingState>(() => {
		if (!sortBy) return []

		const idMapRev: Record<string, string> = {
			agentName: 'user',
			status: 'status',
			value: 'value',
			createdAt: 'date',
		}

		const id = idMapRev[sortBy] || sortBy
		return [{ id, desc: sortOrder === 'desc' }]
	}, [sortBy, sortOrder])

	return (
		<TooltipProvider>
			<div className="grid grid-rows-[auto_1fr] h-full w-full min-w-0 overflow-hidden gap-4">
				{/* Table Header with Add Button */}
				<div className="flex justify-between items-center shrink-0">
					<h3 className="text-lg font-semibold">Lista de Negocios</h3>
					<Button onClick={onAddBusiness} className="gap-2 cursor-pointer">
						<Plus className="h-4 w-4" />
						Agregar negocio
					</Button>
				</div>

				{/* Data Table - fills the 1fr row correctly */}
				<DataTable
					className="h-full w-full"
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
					initialSorting={initialSorting}
					manualSorting={!!onSortingChange}
					onSortingChange={(sortingState) => {
						if (!onSortingChange) return
						const first = sortingState[0]
						if (!first) {
							onSortingChange(undefined, 'desc')
						} else {
							// Map TanStack column id → API sortBy key
							const idMap: Record<string, string> = {
								user: 'agentName',
								status: 'status',
								value: 'value',
								date: 'createdAt',
							}
							const sortBy = idMap[first.id] ?? first.id
							onSortingChange(sortBy, first.desc ? 'desc' : 'asc')
						}
					}}
					renderAdditionalFilters={
						onListStatusChange ||
							onAgentNameChange ||
							(onFundDateFromChange && onFundDateToChange)
							? () => (
								<div className="flex flex-wrap items-center gap-2 py-1">
									{onAgentNameChange ? (
										<div className="w-[180px]">
											<Input
												placeholder="Money Strategist..."
												value={agentName}
												onChange={(e) => onAgentNameChange(e.target.value)}
												className="h-9"
											/>
										</div>
									) : null}
									{onFundDateFromChange && onFundDateToChange ? (
										<fieldset className="border-input bg-muted/25 m-0 inline-flex min-h-10 max-w-full min-w-0 shrink-0 flex-nowrap items-center gap-x-2 rounded-lg border px-2 py-1 shadow-xs">
											<legend className="sr-only">
												Rango de fechas de fondeo para filtrar la tabla
											</legend>
											<span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5">
												<CalendarRange
													className="pointer-events-none size-4 shrink-0"
													aria-hidden
												/>
												<span className="hidden text-xs font-medium whitespace-nowrap md:inline">
													{userRole === UserRole.AGENTE ? 'Creación' : 'Fondeo'}
												</span>
											</span>
											<div className="flex min-w-0 flex-nowrap items-center gap-1.5">
												<Input
													id="fund-date-from"
													type="date"
													value={fundDateFrom}
													onChange={(e) =>
														onFundDateFromChange(e.target.value)
													}
													className="border-0 bg-transparent py-0 leading-none shadow-none h-9 min-w-[7.5rem] max-h-9 flex-1 px-1.5 text-sm focus-visible:ring-2 sm:w-[132px] sm:flex-initial md:w-[145px]"
													aria-label="Fecha de fondeo desde"
												/>
												<span
													className="text-muted-foreground shrink-0 select-none text-xs tabular-nums"
													aria-hidden
												>
													–
												</span>
												<Input
													id="fund-date-to"
													type="date"
													value={fundDateTo}
													onChange={(e) =>
														onFundDateToChange(e.target.value)
													}
													className="border-0 bg-transparent py-0 leading-none shadow-none h-9 min-w-[7.5rem] max-h-9 flex-1 px-1.5 text-sm focus-visible:ring-2 sm:w-[132px] sm:flex-initial md:w-[145px]"
													aria-label="Fecha de fondeo hasta"
												/>
											</div>
										</fieldset>
									) : null}
									{onListStatusChange ? (
										<Select
											value={listStatus ?? LIST_STATUS_FILTER_ALL}
											onValueChange={(v) =>
												onListStatusChange(
													v === LIST_STATUS_FILTER_ALL
														? undefined
														: (v as BusinessStatus)
												)
											}
											disabled={fundDateRangeActive}
										>
											<SelectTrigger
												className="h-9 w-[140px] lg:w-[170px]"
												aria-label="Filtrar por estado del negocio"
												title={fundDateRangeActive ? 'Estado fijo a Fondeado cuando hay rango de fechas' : undefined}
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
									) : null}
								</div>
							)
							: undefined
					}
					toolbarTrailingActions={
						canExportExcel && onExportExcel
							? () => (
								<div className="flex max-w-[min(100%,16rem)] flex-col items-end gap-1">
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-9 gap-1.5 shrink-0"
										disabled={isExportingExcel}
										onClick={onExportExcel}
									>
										<Download className="h-4 w-4" aria-hidden />
										{isExportingExcel
											? 'Exportando…'
											: 'Exportar Excel'}
									</Button>
									{exportExcelError ? (
										<p className="text-destructive max-w-[220px] text-right text-xs">
											{exportExcelError}
										</p>
									) : null}
								</div>
							)
							: undefined
					}
					actions={(row) => {
						const isVentaEfectuado =
							row.statusCode === BUSINESS_STATUS.VENTA_EFECTUADA
						const isEmitido = row.statusCode === BUSINESS_STATUS.EMITIDO
						const canEditEmitido =
							isEmitido &&
							userRole !== undefined &&
							canEditContractWhenBusinessEmitido(userRole)
						const isEditable = isVentaEfectuado || canEditEmitido
						const isCancelable = (isVentaEfectuado || isEmitido) && userRole !== UserRole.AGENTE
						const canFondearRole = canFundPayments(userRole)
						const isFondeado = row.statusCode === BUSINESS_STATUS.FONDEADO
						const showFondearDirect =
							isEmitido &&
							!row.hasPayments &&
							canFondearRole
						const showFondearAnnual =
							row.hasPayments &&
							row.hasPendingPaymentFunding &&
							(isEmitido || isFondeado) &&
							canFondearRole
						const isCoachRole = userRole === UserRole.AGENTE
						const showViewFondeoForCoach =
							isCoachRole &&
							row.hasPayments &&
							(isEmitido || isFondeado)
						const isFondeable = showFondearDirect || showFondearAnnual || showViewFondeoForCoach
						const fondearToolbarLabel = isCoachRole
							? 'Ver Fondeo'
							: showFondearAnnual
								? FONDEAR_ANNUAL_LABEL
								: 'Fondear'
						const fondearToolbarTooltip = isCoachRole
							? 'Ver estado de fondeo'
							: showFondearAnnual
								? FONDEAR_ANNUAL_ACTION_TOOLTIP
								: FONDEAR_ACTION_TOOLTIP

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
													{fondearToolbarLabel}
												</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent side="top" className="max-w-xs">
											<p>{fondearToolbarTooltip}</p>
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
			</div>
		</TooltipProvider>
	)
}
