'use client'

import React, { useMemo, useState } from 'react'
import { DataTable } from '@/features/shared/ui/DataTable/DataTable'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Switch } from '@/features/shared/ui/switch'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import { Edit, MoreHorizontal, Star } from 'lucide-react'
import Link from 'next/link'
import { CommissionRule } from '@/features/distribution-commission/types/commission-rule.types'
import { useCommissionRuleMutations } from '@/features/distribution-commission/hooks/use-commission-rule-mutations'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ColumnDef } from '@tanstack/react-table'
import { formatPercentDisplay } from '@/features/shared/lib/format-percent'
import { getAppLocale } from '@/features/shared/lib/app-locale'

/** Badges de % en tabla: verde oscuro, texto blanco (distribución y cartera). */
const READONLY_PERCENT_BADGE_CLASS =
	'h-auto shrink-0 max-w-full whitespace-normal break-words rounded-md border-transparent bg-emerald-900 px-2 py-1 text-left text-[10px] font-medium leading-snug text-white shadow-none hover:bg-emerald-900'

interface CommissionRulesTableProps {
	data: CommissionRule[]
	productConfigId: number
	onAssignmentSuccess?: () => void
	/** Si se define, el buscador del DataTable dispara búsqueda en servidor (p. ej. descripción). */
	onSearchChange?: (query: string) => void
	searchPlaceholder?: string
}

export function CommissionRulesTable({
	data,
	productConfigId,
	onAssignmentSuccess,
	onSearchChange,
	searchPlaceholder,
}: CommissionRulesTableProps) {
	const { toggleActive, assignNewBusinesses } = useCommissionRuleMutations(
		productConfigId,
		onAssignmentSuccess
	)
	const [togglingId, setTogglingId] = useState<number | null>(null)
	const [assigningId, setAssigningId] = useState<number | null>(null)

	const showPortfolioColumn = useMemo(
		() => data.some((r) => r.hasPortfolio),
		[data]
	)

	const handleToggleActive = async (rule: CommissionRule) => {
		// If trying to activate, check if another distribution is already active
		if (!rule.active && data.some((r) => r.active && r.id !== rule.id)) {
			const activeRule = data.find((r) => r.active)
			toast.error('Activación bloqueada', {
				description: `Ya existe una distribución activa: ${
					activeRule?.description || 'Sin descripción'
				}. Desactívala antes de activar esta.`,
			})
			return
		}

		setTogglingId(rule.id)
		try {
			const result = await toggleActive(rule.id, !rule.active)
			if (result.success) {
				toast.success(
					rule.active ? 'Distribución desactivada' : 'Distribución activada',
					{
						description: `La distribución "${rule.description}" ha sido ${rule.active ? 'desactivada' : 'activada'
							} correctamente.`,
					}
				)
			} else {
				if (
					result.error?.includes(
						'No se puede desactivar: existen negocios asociados'
					)
				) {
					toast.error('Desactivación bloqueada', {
						description: result.error,
					})
					return
				}
				toast.error('Error', {
					description: 'No se pudo cambiar el estado de la distribución.',
				})
			}
		} finally {
			setTogglingId(null)
		}
	}

	const handleAssignDefault = async (rule: CommissionRule) => {
		setAssigningId(rule.id)
		try {
			const success = await assignNewBusinesses(rule.id)
			if (success) {
				toast.success('Distribución predeterminada asignada', {
					description:
						'La distribución fue asignada como predeterminada para nuevos negocios.',
				})
			} else {
				toast.error('Error', {
					description:
						'No se pudo asignar la distribución como predeterminada.',
				})
			}
		} finally {
			setAssigningId(null)
		}
	}

	const columns = useMemo<ColumnDef<CommissionRule>[]>(() => {
		const cols: ColumnDef<CommissionRule>[] = [
			{
				accessorKey: 'description',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Descripción" />
				),
				cell: ({ row }) => (
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium">
							{row.original.description || 'Sin descripción'}
						</span>
						{row.original.isDefaultForNewBusinesses && (
							<Badge
								variant="secondary"
								className="inline-flex items-center gap-1"
							>
								<Star className="h-3 w-3" />
								Nuevos negocios
							</Badge>
						)}
					</div>
				),
			},
			{
				id: 'categories',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title="Categorías/Distribución"
					/>
				),
				cell: ({ row }) => (
					<div className="flex min-w-0 max-w-xl flex-wrap content-start items-start gap-x-2 gap-y-2">
						{row.original.categories &&
						row.original.categories.length > 0 ? (
							row.original.categories.map((cat) => (
								<Badge
									key={cat.idCategory}
									variant="outline"
									className={READONLY_PERCENT_BADGE_CLASS}
								>
									{cat.category?.name || `Cat ${cat.idCategory}`}:{' '}
									{formatPercentDisplay(
										cat.porcentajeDistribucion,
										getAppLocale()
									)}
								</Badge>
							))
						) : (
							<span className="text-muted-foreground text-sm">
								Sin categorías
							</span>
						)}
					</div>
				),
			},
		]

		if (showPortfolioColumn) {
			cols.push({
				id: 'portfolio',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Cartera" />
				),
				cell: ({ row }) => {
					if (!row.original.hasPortfolio) {
						return (
							<span className="text-muted-foreground text-sm">—</span>
						)
					}
					if (
						!row.original.categories ||
						row.original.categories.length === 0
					) {
						return (
							<span className="text-muted-foreground text-sm">—</span>
						)
					}
					return (
						<div className="flex min-w-0 max-w-xl flex-wrap content-start items-start gap-x-2 gap-y-2">
							{row.original.categories.map((cat) => (
								<Badge
									key={cat.idCategory}
									variant="secondary"
									className={READONLY_PERCENT_BADGE_CLASS}
								>
									{cat.category?.name || `Cat ${cat.idCategory}`}{' '}
									cartera:{' '}
									{cat.porcentajePortfolio != null
										? formatPercentDisplay(
												cat.porcentajePortfolio,
												getAppLocale()
											)
										: '—'}
								</Badge>
							))}
						</div>
					)
				},
			})
		}

		cols.push(
			{
				accessorKey: 'active',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Estado" />
				),
				cell: ({ row }) => (
					<Switch
						checked={row.original.active}
						onCheckedChange={() => handleToggleActive(row.original)}
						disabled={togglingId === row.original.id}
					/>
				),
			},
			{
				accessorKey: 'createdAt',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Fecha Creación" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{format(new Date(row.original.createdAt), 'dd/MM/yyyy', {
							locale: es,
						})}
					</span>
				),
			}
		)

		return cols
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showPortfolioColumn, togglingId])

	return (
		<DataTable
			columns={columns}
			data={data}
			emptyMessage="No hay distribuciones de comisión registradas."
			onGlobalSearch={onSearchChange}
			searchDebounceMs={0}
			searchPlaceholder={searchPlaceholder}
			actions={(rule) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Abrir menú</span>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Acciones</DropdownMenuLabel>
						<DropdownMenuItem asChild>
							<Link
								href={`/dashboard/distribucion-comisiones/${productConfigId}/reglas/editar/${rule.id}`}
							>
								<Edit className="mr-2 h-4 w-4" />
								Editar
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleAssignDefault(rule)}
							disabled={
								rule.isDefaultForNewBusinesses ||
								assigningId === rule.id
							}
						>
							Asignar a Nuevos Negocios
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		/>
	)
}
