'use client'

/**
 * Celda de acciones para la tabla de negocios
 * Implementa lógica de visibilidad basada en rol y estado
 */

import { Button } from '@/features/shared/ui/button'
import { Pencil, Eye, Trash2, Coins } from 'lucide-react'

import { UserRole } from '@/features/auth/lib/roles'
import type { BusinessStatus } from '../../types/business-entity.types'
import { BUSINESS_STATUS } from '../../types/business-entity.types'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'
import { FONDEAR_ACTION_TOOLTIP } from '@/features/negocios/lib/fondear-action-copy'

interface ActionCellProps {
	businessId: number
	businessStatus: BusinessStatus
	userRole: UserRole
	hasAnnualPayments: boolean
	onEdit?: (id: number) => void
	onView?: (id: number) => void
	onCancel?: (id: number) => void
	onFondear?: (id: number) => void
}

/**
 * Roles que pueden cancelar negocios
 */
const CANCEL_ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ANALISTA_SOPORTE,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
]

/**
 * Roles que pueden fondear negocios
 */
const FONDEAR_ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.AGENTE,
]

/**
 * Estados que permiten edición
 */
const EDITABLE_STATUSES: BusinessStatus[] = [
	BUSINESS_STATUS.VENTA_EFECTUADA,
	BUSINESS_STATUS.EMITIDO,
]

/**
 * Estados que permiten cancelación
 */
const CANCELABLE_STATUSES: BusinessStatus[] = [
	BUSINESS_STATUS.VENTA_EFECTUADA,
	BUSINESS_STATUS.EMITIDO,
]
export function ActionCell({
	businessId,
	businessStatus,
	userRole,
	hasAnnualPayments,
	onEdit,
	onView,
	onCancel,
	onFondear,
}: ActionCellProps) {
	const canEditStatuses: BusinessStatus[] = [
		BUSINESS_STATUS.VENTA_EFECTUADA,
		BUSINESS_STATUS.EMITIDO,
	]
	const canEditRoles: UserRole[] = [
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ADMIN,
	]
	const canEdit =
		canEditStatuses.includes(businessStatus) && canEditRoles.includes(userRole)

	const canCancel =
		CANCEL_ALLOWED_ROLES.includes(userRole) &&
		CANCELABLE_STATUSES.includes(businessStatus)

	const canFondear =
		businessStatus === BUSINESS_STATUS.EMITIDO &&
		!hasAnnualPayments &&
		FONDEAR_ALLOWED_ROLES.includes(userRole)

	return (
		<TooltipProvider>
			<div className="flex items-center gap-1">
				{/* Botón Editar - Solo si el estado es VENTA_EFECTUADA */}
				{canEdit && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => onEdit?.(businessId)}
							>
								<Pencil className="h-4 w-4 text-muted-foreground" />
								<span className="sr-only">Editar negocio</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Editar negocio</p>
						</TooltipContent>
					</Tooltip>
				)}

				{/* Botón Ver - Siempre visible */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={() => onView?.(businessId)}
						>
							<Eye className="h-4 w-4 text-muted-foreground" />
							<span className="sr-only">Ver negocio</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Ver detalle</p>
					</TooltipContent>
				</Tooltip>

				{/* Botón Fondear - Solo EMITIDO sin anualidades y rol autorizado */}
				{canFondear && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 gap-1.5 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
								onClick={() => onFondear?.(businessId)}
							>
								<Coins className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
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

				{/* Botón Cancelar - Solo si tiene permisos y estado válido */}
				{canCancel && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => onCancel?.(businessId)}
							>
								<Trash2 className="h-4 w-4 text-destructive" />
								<span className="sr-only">Cancelar negocio</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Cancelar negocio</p>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	)
}

/**
 * Exportar constantes para uso en tests
 */
export {
	CANCEL_ALLOWED_ROLES,
	FONDEAR_ALLOWED_ROLES,
	EDITABLE_STATUSES,
	CANCELABLE_STATUSES,
}
