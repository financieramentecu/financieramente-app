'use client'

/**
 * Badge para mostrar el estado de "novedad" de un negocio en VENTA_EFECTUADA
 */

import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import { AlertCircle, Undo2, Clock, XCircle, Ban, HelpCircle } from 'lucide-react'
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
 * Configuración de colores, ícono y etiqueta por estado de novedad.
 * Cada estado combina color e ícono (no solo color) para accesibilidad
 * (WCAG 1.4.1 — no depender únicamente del color para transmitir información).
 */
const STATUS_CONFIG: Record<
	BusinessNovedadStatus,
	{
		label: string
		className: string
		icon: typeof AlertCircle
	}
> = {
	NUEVA: {
		label: 'Nueva',
		className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300',
		icon: AlertCircle,
	},
	SOMETIDA_DEVOLUCION: {
		label: 'Sometida a Devolución',
		className: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300',
		icon: Undo2,
	},
	PENDIENTE: {
		label: 'Pendiente',
		className: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300',
		icon: Clock,
	},
	DECLINADA: {
		label: 'Declinada',
		className: 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300',
		icon: XCircle,
	},
	CANCELADA: {
		label: 'Cancelada',
		className: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300',
		icon: Ban,
	},
}

/**
 * Chip neutro de respaldo cuando `novedadStatus` no coincide con ninguna
 * clave conocida de `STATUS_CONFIG` (defiende contra un backfill no
 * ejecutado o un valor legado inesperado en la base de datos — D9).
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
 * <BusinessNovedadBadge novedadStatus="NUEVA" />
 * <BusinessNovedadBadge novedadStatus="SOMETIDA_DEVOLUCION" />
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
