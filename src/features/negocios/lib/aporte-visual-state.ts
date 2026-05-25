import type { PaymentInstallmentDto } from '../types/business-api.types'

export type AporteVariant =
	| 'FONDEADO_PAST'
	| 'FONDEADO_CURRENT'
	| 'EN_CARTERA'
	| 'PAGO_ANTICIPADO'
	| 'CARTERA_PAGADO'

export type AporteButton = 'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO'

export type AporteVisualState = {
	variant: AporteVariant
	rowClass: string
	label: string | null
	buttons: AporteButton[]
}

function isSameMonthOrFuture(date: string | null, now: Date): boolean {
	if (!date) return false
	const expYearMonth = date.slice(0, 7)
	const nowYear = now.getFullYear()
	const nowMonth = String(now.getMonth() + 1).padStart(2, '0')
	const nowYearMonth = `${nowYear}-${nowMonth}`
	return expYearMonth >= nowYearMonth
}

function resolveReferenceDate(aporte: Pick<PaymentInstallmentDto, 'expectedDate' | 'dateAnchored'>): string | null {
	return aporte.dateAnchored ?? aporte.expectedDate ?? null
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })
	} catch {
		return iso
	}
}

export function getAporteVisualState(
	aporte: PaymentInstallmentDto,
	now: Date,
	canMutate: boolean
): AporteVisualState {
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
				buttons: canMutate ? ['MARK_CARTERA', 'MARK_ANTICIPADO'] : [],
			}
		}

		if (isSameMonthOrFuture(refDate, now)) {
			const dateLabel = aporte.expectedDate
				? `Se fondeará en: ${formatDate(aporte.expectedDate)}`
				: aporte.dateAnchored
					? `Se fondeará en: ${formatDate(aporte.dateAnchored)}`
					: null
			return {
				variant: 'FONDEADO_CURRENT',
				rowClass: 'bg-gray-50 border-border',
				label: dateLabel,
				buttons: canMutate ? ['MARK_CARTERA', 'MARK_ANTICIPADO'] : [],
			}
		}

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

	return {
		variant: 'FONDEADO_CURRENT',
		rowClass: 'bg-gray-50 border-border',
		label: 'Fecha por confirmar',
		buttons: canMutate ? ['MARK_CARTERA', 'MARK_ANTICIPADO'] : [],
	}
}
