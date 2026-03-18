'use client'

/**
 * Celda de acciones para la tabla de negocios
 * Implementa lógica de visibilidad basada en rol y estado
 */

import { Button } from '@/features/shared/ui/button'
import { Pencil, Eye, Trash2 } from 'lucide-react'

import { UserRole } from '@/features/auth/lib/roles'
import type { BusinessStatus } from '../../types/business-entity.types'
import { BUSINESS_STATUS } from '../../types/business-entity.types'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'

interface ActionCellProps {
	businessId: number
	businessStatus: BusinessStatus
	userRole: UserRole
	onEdit?: (id: number) => void
	onView?: (id: number) => void
	onCancel?: (id: number) => void
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
 * Estados que permiten edición
 */
const EDITABLE_STATUSES: BusinessStatus[] = [BUSINESS_STATUS.VENTA_EFECTUADA]

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
	onEdit,
	onView,
	onCancel,
}: ActionCellProps) {
	const canEdit =
		businessStatus === BUSINESS_STATUS.VENTA_EFECTUADA ||
		(businessStatus === BUSINESS_STATUS.EMITIDO &&
			userRole === UserRole.ASISTENTE_GERENCIA_OPERATIVA)
	const canCancel =
		CANCEL_ALLOWED_ROLES.includes(userRole) &&
		CANCELABLE_STATUSES.includes(businessStatus)

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
export { CANCEL_ALLOWED_ROLES, EDITABLE_STATUSES, CANCELABLE_STATUSES }
