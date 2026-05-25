import { describe, it, expect } from 'vitest'
import { getAporteVisualState } from '../aporte-visual-state'
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
