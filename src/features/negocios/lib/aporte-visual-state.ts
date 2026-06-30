import type { PaymentInstallmentDto } from '../types/business-api.types'
import { isSameMonthOrFuture, isStrictlyFutureMonth } from './bogota-date'

export type AporteVariant =
	| 'FONDEADO_PAST'
	| 'FONDEADO_CURRENT'
	| 'EN_CARTERA'
	| 'PAGO_ANTICIPADO'
	| 'CARTERA_PAGADO'
	| 'SIN_FONDEAR'

export type AporteButton = 'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO' | 'FONDEAR'

export type AporteVisualState = {
	variant: AporteVariant
	rowClass: string
	label: string | null
	buttons: AporteButton[]
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
	canMutate: boolean,
	installmentIndex?: number,
	isBusinessEmitido: boolean = false
): AporteVisualState {
	// If business is EMITIDO (not yet funded), only index 1 can have active buttons
	const isFirstPayment = installmentIndex === 1
	const blockedByFirstPaymentRule = isBusinessEmitido && !isFirstPayment

	// ─── SIN_FONDEAR — scheduled payment ──────────────────────────────
	if (aporte.status === 'SIN_FONDEAR') {
		// Installment 1 is manually funded by operators; cron skips it.
		// Show FONDEAR button only for privileged roles; no cartera/anticipado.
		if (isFirstPayment) {
			const label = aporte.expectedDate
				? `Se fondeará en: ${formatDate(aporte.expectedDate)}`
				: 'Sin fondear'
			return {
				variant: 'SIN_FONDEAR',
				rowClass: 'bg-gray-50 border-border',
				label,
				buttons: canMutate ? ['FONDEAR'] : [],
			}
		}

		// Installments 2+ — scheduled, cron-auto-funded
		// If no payment is FONDEADO yet, disable these buttons
		const expectedDate = aporte.expectedDate

		const label = expectedDate
			? `Se fondeará en: ${formatDate(expectedDate)}`
			: 'Sin fondear'

		let buttons: AporteButton[] = []
		if (canMutate && expectedDate && !blockedByFirstPaymentRule) {
			if (isStrictlyFutureMonth(expectedDate, now)) {
				buttons = ['MARK_CARTERA', 'MARK_ANTICIPADO']
			} else if (isSameMonthOrFuture(expectedDate, now)) {
				// same month (current-or-future but not strictly future = same month)
				buttons = ['MARK_CARTERA']
			}
			// past month → no buttons (cron will handle overdue)
		}

		return {
			variant: 'SIN_FONDEAR',
			rowClass: 'bg-gray-50 border-border',
			label,
			buttons,
		}
	}

	// ─── CARTERA_PAGADO ────────────────────────────────────────────────
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

	// ─── EN_CARTERA ────────────────────────────────────────────────────
	if (aporte.status === 'EN_CARTERA') {
		// If no payment is FONDEADO and this is NOT the first payment, button is disabled
		const isDisabled = blockedByFirstPaymentRule
		return {
			variant: 'EN_CARTERA',
			rowClass: 'bg-red-50 border-red-300',
			label: aporte.portfolioDate ? `En cartera: ${formatDate(aporte.portfolioDate)}` : 'En cartera',
			buttons: canMutate && !isDisabled ? ['UNMARK_CARTERA'] : [],
		}
	}

	// ─── PAGO_ANTICIPADO ───────────────────────────────────────────────
	if (aporte.status === 'PAGO_ANTICIPADO') {
		return {
			variant: 'PAGO_ANTICIPADO',
			rowClass: 'bg-green-50 border-green-300',
			label: aporte.earlyPaymentDate ? `Pago anticipado: ${formatDate(aporte.earlyPaymentDate)}` : 'Pago anticipado',
			buttons: [],
		}
	}

	// ─── FONDEADO — actually funded ────────────────────────────────────
	if (aporte.status === 'FONDEADO') {
		// Legacy edge: dateAnchored not set — show "Fecha por confirmar"
		if (!aporte.dateAnchored) {
			return {
				variant: 'FONDEADO_CURRENT',
				rowClass: 'bg-gray-50 border-border',
				label: 'Fecha por confirmar',
				buttons: canMutate ? ['MARK_CARTERA'] : [],
			}
		}

		// dateAnchored is set: this is an actually funded payment.
		// Variant depends on the FUNDING month (dateAnchored), not the due month.
		// MARK_CARTERA is available only while the funding month is current-or-future
		// (human correction window for funding events that turned out unpaid).
		// MARK_ANTICIPADO is NEVER shown — a funded payment cannot be advanced.
		const label = `Fondeado: ${formatDate(aporte.dateAnchored)}`

		if (isSameMonthOrFuture(aporte.dateAnchored, now)) {
			// Funding month is current or future — within correction window
			return {
				variant: 'FONDEADO_CURRENT',
				rowClass: 'bg-green-50 border-green-200',
				label,
				buttons: canMutate ? ['MARK_CARTERA'] : [],
			}
		}

		// Funding month is past — no correction window
		return {
			variant: 'FONDEADO_PAST',
			rowClass: 'bg-green-50 border-green-200',
			label,
			buttons: [],
		}
	}

	// Fallback (unknown status)
	return {
		variant: 'FONDEADO_CURRENT',
		rowClass: 'bg-gray-50 border-border',
		label: 'Fecha por confirmar',
		buttons: canMutate ? ['MARK_CARTERA'] : [],
	}
}
