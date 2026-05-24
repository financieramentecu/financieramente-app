'use client'

import * as React from 'react'
import {
	AlertTriangle,
	CheckCircle2,
	Circle,
	Briefcase,
	Zap,
	X,
	Loader2,
} from 'lucide-react'
import { getAporteVisualState } from '../../lib/aporte-visual-state'
import type { PaymentInstallmentDto } from '../../types/business-api.types'

export type AporteAction = 'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO'

export interface AporteRowProps {
	aporte: PaymentInstallmentDto
	businessId: number
	canMutate: boolean
	isLoading?: boolean
	now?: Date
	onTransitionSuccess: (updated: PaymentInstallmentDto) => void
	onRequestAction: (action: AporteAction, index: number) => void
}

function formatDate(iso: string | null): string {
	if (!iso) return '—'
	try {
		return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })
	} catch {
		return iso
	}
}

export function AporteRow({
	aporte: initialAporte,
	canMutate,
	isLoading = false,
	now = new Date(),
	onTransitionSuccess: _onTransitionSuccess,
	onRequestAction,
}: AporteRowProps) {
	const [aporte, setAporte] = React.useState(initialAporte)

	React.useEffect(() => {
		setAporte(initialAporte)
	}, [initialAporte])

	const visualState = getAporteVisualState(aporte, now, canMutate)
	const isPast = visualState.variant === 'FONDEADO_PAST'
	const isAnticipado = visualState.variant === 'PAGO_ANTICIPADO'
	const isCarteraPagado = visualState.variant === 'CARTERA_PAGADO'
	const isCartera = visualState.variant === 'EN_CARTERA'
	const isCurrent = visualState.variant === 'FONDEADO_CURRENT'
	const isGreen = isPast || isAnticipado || isCarteraPagado

	return (
		<li
			className={[
				'group flex items-center gap-2.5 rounded-lg border transition-all duration-200',
				isGreen
					? 'px-3 py-1.5 bg-green-50 border-green-200 opacity-70'
					: isCartera
						? 'px-3 py-2.5 bg-red-50 border-red-300'
						: 'px-2.5 py-1.5 border-border bg-background hover:bg-muted/40',
			].join(' ')}
		>
			{/* Ícono de estado */}
			{isCartera && (
				<AlertTriangle className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
			)}
			{isGreen && (
				<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
			)}
			{isCurrent && (
				<Circle
					className="h-4 w-4 shrink-0 text-muted-foreground"
					aria-hidden
				/>
			)}

			{/* Texto */}
			<div className="flex min-w-0 flex-1 flex-col">
				<span
					className={[
						'font-medium',
						isGreen || isCurrent ? 'text-xs' : 'text-sm',
						isGreen ? 'text-green-700' : '',
					].join(' ')}
				>
					Aporte {aporte.installmentIndex}
				</span>
				{visualState.label && (
					<span className="text-xs text-muted-foreground">
						{visualState.label}
					</span>
				)}
				{!visualState.label && aporte.expectedDate && (
					<span className="text-xs text-muted-foreground">
						{formatDate(aporte.expectedDate)}
					</span>
				)}
			</div>

			{/* Botones — visibles solo on hover para FONDEADO_CURRENT */}
			{visualState.buttons.length > 0 && (
				<div
					className={[
						'flex shrink-0 gap-1 transition-opacity duration-200',
						isCurrent ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
					].join(' ')}
				>
					{visualState.buttons.includes('MARK_CARTERA') && (
						<button
							type="button"
							aria-label="Marcar como Cartera"
							disabled={isLoading}
							onClick={() =>
								onRequestAction('MARK_CARTERA', aporte.installmentIndex)
							}
							className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors duration-150 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
							) : (
								<Briefcase className="h-3 w-3" aria-hidden />
							)}
							Cartera
						</button>
					)}
					{visualState.buttons.includes('MARK_ANTICIPADO') && (
						<button
							type="button"
							aria-label="Registrar Pago Anticipado"
							disabled={isLoading}
							onClick={() =>
								onRequestAction('MARK_ANTICIPADO', aporte.installmentIndex)
							}
							className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors duration-150 hover:bg-green-50 hover:border-green-300 hover:text-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
							) : (
								<Zap className="h-3 w-3" aria-hidden />
							)}
							Pago Anticipado
						</button>
					)}
					{visualState.buttons.includes('UNMARK_CARTERA') && (
						<button
							type="button"
							aria-label="Quitar de Cartera"
							disabled={isLoading}
							onClick={() =>
								onRequestAction('UNMARK_CARTERA', aporte.installmentIndex)
							}
							className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 shadow-sm transition-colors duration-150 hover:bg-red-100 hover:border-red-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
							) : (
								<X className="h-3 w-3" aria-hidden />
							)}
							Quitar Cartera
						</button>
					)}
				</div>
			)}
		</li>
	)
}
