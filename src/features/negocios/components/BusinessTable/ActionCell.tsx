'use client'

/**
 * Celda de acciones para la tabla de negocios
 * Implementa lógica de visibilidad basada en rol y estado
 */

import { Button } from '@/features/shared/ui/button'
import { Pencil, Eye, Trash2, Coins } from 'lucide-react'

import { usePermissions } from '@/features/shared/hooks/use-permissions'
import { isOwnerScope } from '@/features/access-control/lib/authorization'
import type { BusinessStatus } from '../../types/business-entity.types'
import type { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '../../types/business-entity.types'
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

interface ActionCellProps {
	businessId: number
	businessStatus: BusinessStatus
	userRole: UserRole
	hasPayments: boolean
	hasPendingPaymentFunding: boolean
	onEdit?: (id: number) => void
	onView?: (id: number) => void
	onCancel?: (id: number) => void
	onFondear?: (id: number) => void
}

/**
 * Estados que permiten edición
 */
const EDITABLE_STATUSES: BusinessStatus[] = [
	BUSINESS_STATUS.VENTA_EFECTUADA,
	BUSINESS_STATUS.EMITIDO,
	BUSINESS_STATUS.FONDEADO,
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
	hasPayments,
	hasPendingPaymentFunding,
	onEdit,
	onView,
	onCancel,
	onFondear,
}: ActionCellProps) {
	const { can, scope } = usePermissions()
	const canEdit =
		EDITABLE_STATUSES.includes(businessStatus) && can('negocios.editar_desde_lista')

	const canCancel =
		can('negocios.cancelar') && CANCELABLE_STATUSES.includes(businessStatus)

	const showFondearDirect =
		!hasPayments &&
		businessStatus === BUSINESS_STATUS.EMITIDO
	const showFondearAnnual =
		hasPayments &&
		hasPendingPaymentFunding &&
		(businessStatus === BUSINESS_STATUS.EMITIDO ||
			businessStatus === BUSINESS_STATUS.FONDEADO)

	// Business owners (AGENTE, PARTNER) get the read-only funding view only
	const isCoach = isOwnerScope(scope('negocios.ver'))
	const showViewFondeoForCoach =
		isCoach &&
		hasPayments &&
		(businessStatus === BUSINESS_STATUS.EMITIDO ||
			businessStatus === BUSINESS_STATUS.FONDEADO)
	const showFondearButton =
		(can('aportes.fondear') && (showFondearDirect || showFondearAnnual)) ||
		showViewFondeoForCoach

	const fondearButtonLabel = isCoach
		? 'Ver Fondeo'
		: showFondearAnnual
			? FONDEAR_ANNUAL_LABEL
			: 'Fondear'
	const fondearTooltip = isCoach
		? 'Ver estado de fondeo'
		: showFondearAnnual
			? FONDEAR_ANNUAL_ACTION_TOOLTIP
			: FONDEAR_ACTION_TOOLTIP

	return (
		<TooltipProvider>
			<div className="flex items-center gap-1">
				{/* Botón Editar — Venta Efectuada, Emitido o Fondeado, con rol autorizado */}
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

				{/* Botón Fondear — directo sin cuotas anuales o flujo anual */}
				{showFondearButton && (
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
									{fondearButtonLabel}
								</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top" className="max-w-xs">
							<p>{fondearTooltip}</p>
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
	EDITABLE_STATUSES,
	CANCELABLE_STATUSES,
}
