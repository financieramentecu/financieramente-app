'use client'

/**
 * Badge para mostrar el estado de un negocio
 */

import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import type { BusinessStatus } from '../../types/business-entity.types'

interface BusinessStatusBadgeProps {
	status: BusinessStatus
	className?: string
}

/**
 * Configuración de colores y etiquetas por estado
 */
const STATUS_CONFIG: Record<
	BusinessStatus,
	{
		label: string
		variant: 'default' | 'success' | 'destructive' | 'secondary'
		className: string
	}
> = {
	VENTA_EFECTUADA: {
		label: 'Venta Efectuada',
		variant: 'default',
		className: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
	},
	EMITIDO: {
		label: 'Emitido',
		variant: 'success',
		className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
	},
	CANCELADO: {
		label: 'Cancelado',
		variant: 'destructive',
		className: 'bg-red-100 text-red-800 hover:bg-red-200',
	},
	COMISIONANDO: {
		label: 'Comisionando',
		variant: 'secondary',
		className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
	},
	FONDEADO: {
		label: 'Fondeado',
		variant: 'default',
		className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
	},
}

/**
 * Badge de estado para negocios
 *
 * @example
 * ```tsx
 * <BusinessStatusBadge status="VENTA_EFECTUADA" />
 * <BusinessStatusBadge status="EMITIDO" />
 * <BusinessStatusBadge status="CANCELADO" />
 * ```
 */
export function BusinessStatusBadge({
	status,
	className,
}: BusinessStatusBadgeProps) {
	const config = STATUS_CONFIG[status]

	if (!config) {
		return <Badge variant="secondary">{status}</Badge>
	}

	return (
		<Badge className={cn(config.className, className)}>{config.label}</Badge>
	)
}
