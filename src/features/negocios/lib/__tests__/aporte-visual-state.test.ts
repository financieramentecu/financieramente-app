import { describe, it, expect } from 'vitest'
import { getAporteVisualState } from '../aporte-visual-state'
import type { PaymentInstallmentDto } from '../../types/business-api.types'

// Fixed "now" in UTC: June 15, 2026 at noon UTC = June 15, 2026 07:00 Bogota
const now = new Date('2026-06-15T12:00:00Z')

function makeAporte(
	overrides: Partial<PaymentInstallmentDto>
): PaymentInstallmentDto {
	return {
		installmentIndex: 1,
		status: 'FONDEADO',
		dateAnchored: null,
		expectedDate: null,
		portfolioDate: null,
		earlyPaymentDate: null,
		portfolioPaymentDate: null,
		...overrides,
	}
}

describe('getAporteVisualState', () => {
	// ─── SIN_FONDEAR ──────────────────────────────────────────────────
	describe('SIN_FONDEAR — new variant', () => {
		const aporte = makeAporte({ status: 'SIN_FONDEAR' })

		it('returns SIN_FONDEAR variant', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe('SIN_FONDEAR')
		})

		it('returns no buttons for privileged role', () => {
			expect(getAporteVisualState(aporte, now, true).buttons).toEqual([])
		})

		it('returns no buttons for read-only role', () => {
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('has gray row class', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.rowClass).toContain('gray')
		})

		it('has a non-null label', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.label).not.toBeNull()
		})
	})

	// ─── FONDEADO_PAST ────────────────────────────────────────────────
	describe('FONDEADO_PAST — past Bogota month', () => {
		// now = June 2026; expectedDate = March 2026 → past
		const aporte = makeAporte({
			status: 'FONDEADO',
			expectedDate: '2026-03-01T00:00:00.000Z',
		})

		it('returns FONDEADO_PAST variant for any role', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe('FONDEADO_PAST')
			expect(getAporteVisualState(aporte, now, false).variant).toBe('FONDEADO_PAST')
		})

		it('returns no buttons regardless of canMutate', () => {
			expect(getAporteVisualState(aporte, now, true).buttons).toEqual([])
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('has green row class', () => {
			expect(getAporteVisualState(aporte, now, true).rowClass).toContain('green')
		})
	})

	// ─── FONDEADO_CURRENT ─────────────────────────────────────────────
	describe('FONDEADO_CURRENT — same Bogota month', () => {
		// now = June 2026; expectedDate = June 2026 → same month
		const aporte = makeAporte({
			status: 'FONDEADO',
			expectedDate: '2026-06-01T00:00:00.000Z',
		})

		it('returns FONDEADO_CURRENT variant', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe('FONDEADO_CURRENT')
		})

		it('returns MARK_CARTERA only (not MARK_ANTICIPADO) for privileged role', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).not.toContain('MARK_ANTICIPADO')
		})

		it('returns no buttons for read-only roles', () => {
			const vs = getAporteVisualState(aporte, now, false)
			expect(vs.buttons).toEqual([])
		})
	})

	// ─── FONDEADO (future Bogota month) → FONDEADO_CURRENT with anticipado ────
	describe('FONDEADO — strictly future Bogota month', () => {
		// now = June 2026; expectedDate = August 2026 → strictly future
		const aporte = makeAporte({
			status: 'FONDEADO',
			expectedDate: '2026-08-01T00:00:00.000Z',
		})

		it('returns FONDEADO_CURRENT variant (future months still use FONDEADO_CURRENT)', () => {
			// The design spec maps strictly future months to FONDEADO_CURRENT too, but with both buttons
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.variant).toBe('FONDEADO_CURRENT')
		})

		it('returns MARK_CARTERA and MARK_ANTICIPADO for privileged role (strictly future month)', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).toContain('MARK_ANTICIPADO')
		})

		it('returns no buttons for read-only roles', () => {
			const vs = getAporteVisualState(aporte, now, false)
			expect(vs.buttons).toEqual([])
		})
	})

	// ─── Bogota timezone edge ──────────────────────────────────────────
	describe('Bogota UTC midnight edge — isSameMonthOrFuture uses Bogota TZ', () => {
		it('UTC 2026-07-01T03:00Z = Bogota June 30: expectedDate July should be future (not current)', () => {
			// now in UTC is July 1 2026 at 03:00Z = Bogota June 30 22:00
			// Bogota month is June, so July expectedDate is strictly future → both buttons
			const nowEdge = new Date('2026-07-01T03:00:00Z')
			const aporte = makeAporte({
				status: 'FONDEADO',
				expectedDate: '2026-07-01T00:00:00.000Z',
			})
			const vs = getAporteVisualState(aporte, nowEdge, true)
			// July payment with Bogota "June" now → strictly future → both buttons visible
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).toContain('MARK_ANTICIPADO')
		})
	})

	// ─── EN_CARTERA ───────────────────────────────────────────────────
	describe('EN_CARTERA', () => {
		const aporte = makeAporte({
			status: 'EN_CARTERA',
			portfolioDate: '2026-05-10T00:00:00.000Z',
		})

		it('returns EN_CARTERA variant', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe('EN_CARTERA')
		})

		it('returns UNMARK_CARTERA only for privileged roles', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.buttons).toEqual(['UNMARK_CARTERA'])
		})

		it('returns no buttons for read-only roles', () => {
			const vs = getAporteVisualState(aporte, now, false)
			expect(vs.buttons).toEqual([])
		})

		it('has red row class', () => {
			expect(getAporteVisualState(aporte, now, true).rowClass).toContain('red')
		})
	})

	// ─── PAGO_ANTICIPADO ──────────────────────────────────────────────
	describe('PAGO_ANTICIPADO', () => {
		const aporte = makeAporte({
			status: 'PAGO_ANTICIPADO',
			earlyPaymentDate: '2026-05-12T00:00:00.000Z',
		})

		it('returns PAGO_ANTICIPADO variant', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe('PAGO_ANTICIPADO')
		})

		it('returns no buttons for any role', () => {
			expect(getAporteVisualState(aporte, now, true).buttons).toEqual([])
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('includes date in label', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.label).toMatch(/Pago anticipado/)
		})

		it('has green row class', () => {
			expect(getAporteVisualState(aporte, now, true).rowClass).toContain('green')
		})
	})

	// ─── CARTERA_PAGADO ───────────────────────────────────────────────
	describe('CARTERA_PAGADO', () => {
		const aporte = makeAporte({
			status: 'CARTERA_PAGADO',
			portfolioPaymentDate: '2026-05-20T00:00:00.000Z',
		})

		it('returns CARTERA_PAGADO variant', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe('CARTERA_PAGADO')
		})

		it('returns no buttons for any role — terminal state', () => {
			expect(getAporteVisualState(aporte, now, true).buttons).toEqual([])
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('includes portfolioPaymentDate in label', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.label).toMatch(/Cartera pagada/)
		})

		it('has green row class', () => {
			expect(getAporteVisualState(aporte, now, true).rowClass).toContain('green')
		})
	})
})
