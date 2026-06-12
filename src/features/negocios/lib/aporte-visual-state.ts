import type { PaymentInstallmentDto } from '../types/business-api.types'
import { isSameMonthOrFuture, isStrictlyFutureMonth } from './bogota-date'

export type AporteVariant =
	| 'FONDEADO_PAST'
	| 'FONDEADO_CURRENT'
	| 'EN_CARTERA'
	| 'PAGO_ANTICIPADO'
	| 'CARTERA_PAGADO'
	| 'SIN_FONDEAR'

export type AporteButton = 'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO' | 'MARK_FONDEAR'

export type AporteVisualState = {
	variant: AporteVariant
	rowClass: string
	label: string | null
	buttons: AporteButton[]
}

function resolveReferenceDate(aporte: Pick<PaymentInstallmentDto, 'expectedDate' | 'dateAnchored'>): string | null {
	return aporte.expectedDate ?? aporte.dateAnchored ?? null
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })
	} catch {
		return iso
	}
}

export function getFirstPaymentFondeoButton(
	aporte: Pick<PaymentInstallmentDto, 'installmentIndex' | 'status'>,
	business: { status: string; dateAnchored: string | null },
	canMutate: boolean
): AporteButton[] {
	if (
		business.status === 'EMITIDO' &&
		!business.dateAnchored &&
		aporte.installmentIndex === 1 &&
		aporte.status === 'FONDEADO' &&
		canMutate
	) {
		return ['MARK_FONDEAR']
	}
	return []
}

export function getAporteVisualState(
	aporte: PaymentInstallmentDto,
	now: Date,
	canMutate: boolean
): AporteVisualState {
	if (aporte.status === 'SIN_FONDEAR') {
		return {
			variant: 'SIN_FONDEAR',
			rowClass: 'bg-gray-50 border-border',
			label: 'Sin fondear',
			buttons: [],
		}
	}

	if (aporte.status === 'CARTERA_PAGADO') {
		return {
			variant: 'CARTERA_PAGADO',
			rowClass: 'bg-green-50 border-green-300',
			label: aporte.portfolioPaymentDate
				? `Cartera pagada: ${formatDate(aporte.portfolioPaymentDate)}`
				: 'Cartera pagada',
			buttons: [],
		}
	}

	if (aporte.status === 'EN_CARTERA') {
		return {
			variant: 'EN_CARTERA',
			rowClass: 'bg-red-50 border-red-300',
			label: aporte.portfolioDate ? `En cartera: ${formatDate(aporte.portfolioDate)}` : 'En cartera',
			buttons: canMutate ? ['UNMARK_CARTERA'] : [],
		}
	}

	if (aporte.status === 'PAGO_ANTICIPADO') {
		return {
			variant: 'PAGO_ANTICIPADO',
			rowClass: 'bg-green-50 border-green-300',
			label: aporte.earlyPaymentDate ? `Pago anticipado: ${formatDate(aporte.earlyPaymentDate)}` : 'Pago anticipado',
			buttons: [],
		}
	}

	if (aporte.status === 'FONDEADO') {
		const refDate = resolveReferenceDate(aporte)

		if (!refDate) {
			return {
				variant: 'FONDEADO_CURRENT',
				rowClass: 'bg-gray-50 border-border',
				label: 'Fecha por confirmar',
				buttons: canMutate ? ['MARK_CARTERA'] : [],
			}
		}

		// Past month — no buttons
		if (!isSameMonthOrFuture(refDate, now)) {
			const dateLabel = aporte.dateAnchored
				? `Fondeado: ${formatDate(aporte.dateAnchored)}`
				: `Fecha esperada: ${formatDate(aporte.expectedDate!)}`
			return {
				variant: 'FONDEADO_PAST',
				rowClass: 'bg-green-50 border-green-200',
				label: dateLabel,
				buttons: [],
			}
		}

		// Same month: Marcar Cartera only (no anticipado)
		// Future month: both Marcar Cartera and Pago Anticipado
		const dateLabel = aporte.expectedDate
			? `Se fondeará en: ${formatDate(aporte.expectedDate)}`
			: aporte.dateAnchored
				? `Se fondeará en: ${formatDate(aporte.dateAnchored)}`
				: null

		const buttons: AporteButton[] = canMutate
			? isStrictlyFutureMonth(refDate, now)
				? ['MARK_CARTERA', 'MARK_ANTICIPADO']
				: ['MARK_CARTERA']
			: []

		return {
			variant: 'FONDEADO_CURRENT',
			rowClass: 'bg-gray-50 border-border',
			label: dateLabel,
			buttons,
		}
	}

	return {
		variant: 'FONDEADO_CURRENT',
		rowClass: 'bg-gray-50 border-border',
		label: 'Fecha por confirmar',
		buttons: canMutate ? ['MARK_CARTERA'] : [],
	}
}
