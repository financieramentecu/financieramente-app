'use client'

import { useState } from 'react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/features/shared/ui/table'
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
import { CommissionRule } from '@/features/commission-rules/types/commission-rule.types'
import { useCommissionRuleMutations } from '@/features/commission-rules/hooks/use-commission-rule-mutations'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CommissionRulesTableProps {
	data: CommissionRule[]
	productConfigId: number
}

export function CommissionRulesTable({
	data,
	productConfigId,
}: CommissionRulesTableProps) {
	const { toggleActive, assignNewBusinesses } =
		useCommissionRuleMutations(productConfigId)
	const [togglingId, setTogglingId] = useState<number | null>(null)
	const [assigningId, setAssigningId] = useState<number | null>(null)

	const handleToggleActive = async (rule: CommissionRule) => {
		setTogglingId(rule.id)
		try {
			const success = await toggleActive(rule.id, !rule.active)
			if (success) {
				toast.success(rule.active ? 'Regla desactivada' : 'Regla activada', {
					description: `La regla "${rule.description}" ha sido ${
						rule.active ? 'desactivada' : 'activada'
					} correctamente.`,
				})
			} else {
				toast.error('Error', {
					description: 'No se pudo cambiar el estado de la regla.',
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
				toast.success('Regla predeterminada asignada', {
					description:
						'La regla fue asignada como predeterminada para nuevos negocios.',
				})
			} else {
				toast.error('Error', {
					description:
						'No se pudo asignar la regla como predeterminada.',
				})
			}
		} finally {
			setAssigningId(null)
		}
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Descripción</TableHead>
						<TableHead>Categorías</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Fecha Creación</TableHead>
						<TableHead className="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={5}
								className="h-24 text-center text-muted-foreground"
							>
								No hay reglas de comisión registradas.
							</TableCell>
						</TableRow>
					) : (
						data.map((rule) => (
							<TableRow key={rule.id}>
								<TableCell className="font-medium">
									<div className="flex flex-wrap items-center gap-2">
										<span>
											{rule.description || 'Sin descripción'}
										</span>
										{rule.isDefaultForNewBusinesses && (
											<Badge
												variant="secondary"
												className="inline-flex items-center gap-1"
											>
												<Star className="h-3 w-3" />
												Predeterminada
											</Badge>
										)}
									</div>
								</TableCell>
								<TableCell>
									{rule.categories?.length || 0} categorías
								</TableCell>
								<TableCell>
									<Switch
										checked={rule.active}
										onCheckedChange={() =>
											handleToggleActive(rule)
										}
										disabled={togglingId === rule.id}
									/>
								</TableCell>
								<TableCell>
									{format(
										new Date(rule.createdAt),
										'dd/MM/yyyy',
										{ locale: es }
									)}
								</TableCell>
								<TableCell>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												className="h-8 w-8 p-0"
											>
												<span className="sr-only">
													Abrir menú
												</span>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuLabel>
												Acciones
											</DropdownMenuLabel>
											<DropdownMenuItem asChild>
												<Link
													href={`/dashboard/configuraciones-producto/${productConfigId}/reglas/editar/${rule.id}`}
												>
													<Edit className="mr-2 h-4 w-4" />
													Editar
												</Link>
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() =>
													handleAssignDefault(rule)
												}
												disabled={
													rule.isDefaultForNewBusinesses ||
													assigningId === rule.id
												}
											>
												Asignar a Nuevos Negocios
											</DropdownMenuItem>
											{/* Placeholder for future actions like Detail View */}
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	)
}
