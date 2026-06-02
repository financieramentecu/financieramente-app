import { describe, it, expect } from 'vitest'
import { getAporteVisualState, getFirstPaymentFondeoButton } from '../aporte-visual-state'
import type { AporteButton } from '../aporte-visual-state'
import type { PaymentInstallmentDto } from '../../types/business-api.types'

const now = new Date(2025, 4, 15) // May 15, 2025

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

describe('getFirstPaymentFondeoButton', () => {
	it('is exported from aporte-visual-state', () => {
		expect(getFirstPaymentFondeoButton).toBeDefined()
		expect(typeof getFirstPaymentFondeoButton).toBe('function')
	})

	it('MARK_FONDEAR is a valid AporteButton member — type check via value', () => {
		const btn: AporteButton = 'MARK_FONDEAR'
		expect(btn).toBe('MARK_FONDEAR')
	})

	// Task 1.3 — truth table
	it('returns MARK_FONDEAR when business=EMITIDO, no dateAnchored, index=1, status=FONDEADO, canMutate=true', () => {
		const result = getFirstPaymentFondeoButton(
			{ installmentIndex: 1, status: 'FONDEADO' },
			{ status: 'EMITIDO', dateAnchored: null },
			true
		)
		expect(result).toEqual(['MARK_FONDEAR'])
	})

	it('returns [] when payment is EN_CARTERA (payment in cartera, button must be hidden)', () => {
		const result = getFirstPaymentFondeoButton(
			{ installmentIndex: 1, status: 'EN_CARTERA' },
			{ status: 'EMITIDO', dateAnchored: null },
			true
		)
		expect(result).toEqual([])
	})

	it('returns [] when business is FONDEADO (already fondeado)', () => {
		const result = getFirstPaymentFondeoButton(
			{ installmentIndex: 1, status: 'FONDEADO' },
			{ status: 'FONDEADO', dateAnchored: null },
			true
		)
		expect(result).toEqual([])
	})

	it('returns [] when dateAnchored is set (already has fondeo date)', () => {
		const result = getFirstPaymentFondeoButton(
			{ installmentIndex: 1, status: 'FONDEADO' },
			{ status: 'EMITIDO', dateAnchored: '2024-01-15T00:00:00.000Z' },
			true
		)
		expect(result).toEqual([])
	})

	it('returns [] when installmentIndex > 1 (non-first installment)', () => {
		const result = getFirstPaymentFondeoButton(
			{ installmentIndex: 2, status: 'FONDEADO' },
			{ status: 'EMITIDO', dateAnchored: null },
			true
		)
		expect(result).toEqual([])
	})

	it('returns [] when canMutate=false (unauthorized role)', () => {
		const result = getFirstPaymentFondeoButton(
			{ installmentIndex: 1, status: 'FONDEADO' },
			{ status: 'EMITIDO', dateAnchored: null },
			false
		)
		expect(result).toEqual([])
	})
})

describe('getAporteVisualState', () => {
	describe('FONDEADO_PAST — past month', () => {
		const aporte = makeAporte({
			status: 'FONDEADO',
			expectedDate: '2025-03-01T00:00:00.000Z',
		})

		it('returns FONDEADO_PAST variant for any role', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe(
				'FONDEADO_PAST'
			)
			expect(getAporteVisualState(aporte, now, false).variant).toBe(
				'FONDEADO_PAST'
			)
		})

		it('returns no buttons regardless of canMutate', () => {
			expect(getAporteVisualState(aporte, now, true).buttons).toEqual([])
			expect(getAporteVisualState(aporte, now, false).buttons).toEqual([])
		})

		it('has green row class', () => {
			expect(getAporteVisualState(aporte, now, true).rowClass).toContain(
				'green'
			)
		})
	})

	describe('FONDEADO_CURRENT — current/future month', () => {
		const aporte = makeAporte({
			status: 'FONDEADO',
			expectedDate: '2025-05-01T00:00:00.000Z',
		})

		it('returns FONDEADO_CURRENT variant', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe(
				'FONDEADO_CURRENT'
			)
		})

		it('returns MARK_CARTERA and MARK_ANTICIPADO for privileged roles', () => {
			const vs = getAporteVisualState(aporte, now, true)
			expect(vs.buttons).toContain('MARK_CARTERA')
			expect(vs.buttons).toContain('MARK_ANTICIPADO')
		})

		it('returns no buttons for read-only roles', () => {
			const vs = getAporteVisualState(aporte, now, false)
			expect(vs.buttons).toEqual([])
		})
	})

	describe('EN_CARTERA', () => {
		const aporte = makeAporte({
			status: 'EN_CARTERA',
			portfolioDate: '2025-05-10T00:00:00.000Z',
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

	describe('PAGO_ANTICIPADO', () => {
		const aporte = makeAporte({
			status: 'PAGO_ANTICIPADO',
			earlyPaymentDate: '2025-05-12T00:00:00.000Z',
		})

		it('returns PAGO_ANTICIPADO variant', () => {
			expect(getAporteVisualState(aporte, now, true).variant).toBe(
				'PAGO_ANTICIPADO'
			)
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
			expect(getAporteVisualState(aporte, now, true).rowClass).toContain(
				'green'
			)
		})
	})

	describe('CARTERA_PAGADO', () => {
		const aporte = makeAporte({
			status: 'CARTERA_PAGADO',
			portfolioPaymentDate: '2025-05-20T00:00:00.000Z',
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
