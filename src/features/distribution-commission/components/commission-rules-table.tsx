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

interface CommissionRulesTableProps {
	data: CommissionRule[]
	productConfigId: number
	onAssignmentSuccess?: () => void
}

export function CommissionRulesTable({
	data,
	productConfigId,
	onAssignmentSuccess,
}: CommissionRulesTableProps) {
	const { toggleActive, assignNewBusinesses } = useCommissionRuleMutations(
		productConfigId,
		onAssignmentSuccess
	)
	const [togglingId, setTogglingId] = useState<number | null>(null)
	const [assigningId, setAssigningId] = useState<number | null>(null)

	const handleToggleActive = async (rule: CommissionRule) => {
		setTogglingId(rule.id)
		try {
			const result = await toggleActive(rule.id, !rule.active)
			if (result.success) {
				toast.success(
					rule.active ? 'Distribución desactivada' : 'Distribución activada',
					{
						description: `La distribución "${rule.description}" ha sido ${
							rule.active ? 'desactivada' : 'activada'
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

	const columns = useMemo<ColumnDef<CommissionRule>[]>(
		() => [
			{
				accessorKey: 'description',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
				cell: ({ row }) => (
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium">{row.original.description || 'Sin descripción'}</span>
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
				header: ({ column }) => <DataTableColumnHeader column={column} title="Categorías/Distribución" />,
				cell: ({ row }) => (
					<div className="flex flex-wrap gap-1">
						{row.original.categories && row.original.categories.length > 0 ? (
							row.original.categories.map((cat) => (
								<Badge key={cat.idCategory} variant="outline" className="text-[10px]">
									{cat.category?.name || `Cat ${cat.idCategory}`}:{' '}
									{cat.porcentajeDistribucion}%
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
			{
				accessorKey: 'active',
				header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
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
				header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Creación" />,
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{format(new Date(row.original.createdAt), 'dd/MM/yyyy', {
							locale: es,
						})}
					</span>
				),
			},
		],
		[togglingId]
	)

	return (
		<DataTable
			columns={columns}
			data={data}
			emptyMessage="No hay distribuciones de comisión registradas."
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
