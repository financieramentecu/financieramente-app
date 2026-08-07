'use client'

/**
 * Badge para mostrar el estado de "novedad" de un negocio en VENTA_EFECTUADA
 */

import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import type { BusinessNovedadStatus } from '../../types/business-entity.types'

interface BusinessNovedadBadgeProps {
	novedadStatus: BusinessNovedadStatus | null
	className?: string
	/**
	 * "compact" (default): just "Pendiente"/"Resuelta", used in the business list
	 * where the "Novedad" column header already gives context.
	 * "detailed": prefixes "Novedad " so the chip reads on its own in a detail view.
	 */
	variant?: 'compact' | 'detailed'
}

/**
 * Configuración de colores, ícono y etiqueta por estado de novedad
 */
const STATUS_CONFIG: Record<
	BusinessNovedadStatus,
	{
		label: string
		className: string
		icon: typeof AlertTriangle
	}
> = {
	PENDIENTE: {
		label: 'Pendiente',
		className: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300',
		icon: AlertTriangle,
	},
	RESUELTA: {
		label: 'Resuelta',
		className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300',
		icon: CheckCircle2,
	},
}

/**
 * Chip neutro de respaldo para cuando `novedadStatus` no coincide con ninguna
 * clave conocida de `STATUS_CONFIG` — defiende contra datos de otra rama/
 * migración en curso que ya usa un vocabulario de estados más amplio.
 */
const FALLBACK_CONFIG = {
	className: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300',
	icon: HelpCircle,
}

/**
 * Badge de novedad para negocios
 * No renderiza nada cuando `novedadStatus` es `null` (negocio nunca marcado)
 *
 * @example
 * ```tsx
 * <BusinessNovedadBadge novedadStatus="PENDIENTE" />
 * <BusinessNovedadBadge novedadStatus="RESUELTA" />
 * <BusinessNovedadBadge novedadStatus={null} />
 * ```
 */
export function BusinessNovedadBadge({
	novedadStatus,
	className,
	variant = 'compact',
}: BusinessNovedadBadgeProps) {
	if (!novedadStatus) {
		return null
	}

	const config = STATUS_CONFIG[novedadStatus]
	const Icon = config?.icon ?? FALLBACK_CONFIG.icon
	const badgeClassName = config?.className ?? FALLBACK_CONFIG.className
	const label = config
		? variant === 'detailed'
			? `Novedad ${config.label}`
			: config.label
		: novedadStatus

	return (
		<Badge className={cn('gap-1', badgeClassName, className)}>
			<Icon className="h-3.5 w-3.5" />
			{label}
		</Badge>
	)
}
