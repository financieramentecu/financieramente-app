'use client'

import * as React from 'react'
import {
	AlertTriangle,
	CheckCircle2,
	Briefcase,
	Zap,
	X,
	Loader2,
	Pencil,
	BadgeDollarSign,
} from 'lucide-react'
import { getAporteVisualState } from '../../lib/aporte-visual-state'
import type { PaymentInstallmentDto } from '../../types/business-api.types'
import { formatDateBogota } from '@/features/shared/lib/format-date'

export type AporteAction = 'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO' | 'FONDEAR'

export interface AporteRowProps {
	aporte: PaymentInstallmentDto
	businessId: number
	canMutate: boolean
	isLoading?: boolean
	now?: Date
	onTransitionSuccess: (updated: PaymentInstallmentDto) => void
	onRequestAction: (action: AporteAction, index: number) => void
	onEditFundedDate?: (index: number) => void
	installmentIndex?: number
	isBusinessEmitido?: boolean
}

function formatDate(iso: string | null): string {
	if (!iso) return '—'
	try {
		return formatDateBogota(iso)
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
	onEditFundedDate,
	installmentIndex,
	isBusinessEmitido = false,
}: AporteRowProps) {
	const [aporte, setAporte] = React.useState(initialAporte)

	React.useEffect(() => {
		setAporte(initialAporte)
	}, [initialAporte])

	const visualState = getAporteVisualState(aporte, now, canMutate, installmentIndex, isBusinessEmitido)
	const allButtons = visualState.buttons
	const hasFondear = allButtons.includes('FONDEAR')
	const isPast = visualState.variant === 'FONDEADO_PAST'
	const isAnticipado = visualState.variant === 'PAGO_ANTICIPADO'
	const isCarteraPagado = visualState.variant === 'CARTERA_PAGADO'
	const isCartera = visualState.variant === 'EN_CARTERA'
	const isCurrent = visualState.variant === 'FONDEADO_CURRENT'
	const isGreen = isPast || isCurrent || isAnticipado || isCarteraPagado
	// Past/terminal states are dimmed — current still has interactive buttons so no opacity
	const isDimmed = isPast || isAnticipado || isCarteraPagado

	return (
		<li
			className={[
				'group flex items-center gap-2.5 rounded-lg border transition-all duration-200',
				hasFondear
					? 'px-2.5 py-1.5 bg-amber-50 border-amber-300'
					: isGreen
						? `px-3 py-1.5 bg-green-50 border-green-200${isDimmed ? ' opacity-70' : ''}`
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

			{/* Texto */}
			<div className="flex min-w-0 flex-1 flex-col">
				<span
					className={[
						'font-medium',
						isGreen ? 'text-xs text-green-700' : 'text-sm',
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
			{allButtons.length > 0 && (
				<div
					className={[
						'flex shrink-0 gap-1 transition-opacity duration-200',
						isCartera ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
					].join(' ')}
				>
					{allButtons.includes('MARK_CARTERA') && (
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
					{allButtons.includes('MARK_ANTICIPADO') && (
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
					{allButtons.includes('UNMARK_CARTERA') && (
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
					{allButtons.includes('FONDEAR') && (
						<button
							type="button"
							aria-label="Fondear primer aporte"
							disabled={isLoading}
							onClick={() =>
								onRequestAction('FONDEAR', aporte.installmentIndex)
							}
							className="inline-flex items-center gap-1.5 rounded-md border border-green-400 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 shadow-sm transition-colors duration-150 hover:bg-green-100 hover:border-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
							) : (
								<BadgeDollarSign className="h-3 w-3" aria-hidden />
							)}
							Fondear
						</button>
					)}
				</div>
			)}

			{/* Edit funded date affordance — visible for FONDEADO_PAST / FONDEADO_CURRENT with canMutate */}
			{(isPast || isCurrent) && canMutate && onEditFundedDate && (
				<button
					type="button"
					aria-label="Editar fecha de fondeo"
					disabled={isLoading}
					onClick={() => onEditFundedDate(aporte.installmentIndex)}
					className="shrink-0 inline-flex items-center justify-center rounded-md border border-border bg-background p-1 text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
				>
					<Pencil className="h-3 w-3" aria-hidden />
				</button>
			)}
		</li>
	)
}
