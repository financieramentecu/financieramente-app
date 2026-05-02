import { describe, it, expect } from 'vitest'
import { calculateNumAportes } from '../calculate-num-aportes'

describe('calculateNumAportes', () => {
	describe('exceptions', () => {
		it('SKANDIA + MFUND → 0', () => {
			expect(
				calculateNumAportes({
					termYears: 10,
					periodicityName: 'Mensual',
					companyName: 'SKANDIA',
					productName: 'MFUND',
				}),
			).toBe(0)
		})

		it('Pago Único → 1 (regardless of term)', () => {
			expect(
				calculateNumAportes({
					termYears: 5,
					periodicityName: 'Pago Único',
					companyName: null,
					productName: null,
				}),
			).toBe(1)
		})

		it('Aportes Ocasionales → 1 (regardless of term)', () => {
			expect(
				calculateNumAportes({
					termYears: 5,
					periodicityName: 'Aportes Ocasionales',
					companyName: null,
					productName: null,
				}),
			).toBe(1)
		})

		it('null termYears → 0', () => {
			expect(
				calculateNumAportes({
					termYears: null,
					periodicityName: 'Mensual',
					companyName: null,
					productName: null,
				}),
			).toBe(0)
		})

		it('null periodicityName → 0', () => {
			expect(
				calculateNumAportes({
					termYears: 5,
					periodicityName: null,
					companyName: null,
					productName: null,
				}),
			).toBe(0)
		})

		it('unknown periodicity → 0', () => {
			expect(
				calculateNumAportes({
					termYears: 5,
					periodicityName: 'Desconocida',
					companyName: null,
					productName: null,
				}),
			).toBe(0)
		})
	})

	describe('standard multipliers', () => {
		it('Mensual, term=5 → 60', () => {
			expect(
				calculateNumAportes({
					termYears: 5,
					periodicityName: 'Mensual',
					companyName: null,
					productName: null,
				}),
			).toBe(60)
		})

		it('Semestral, term=3 → 6', () => {
			expect(
				calculateNumAportes({
					termYears: 3,
					periodicityName: 'Semestral',
					companyName: null,
					productName: null,
				}),
			).toBe(6)
		})

		it('Anual, term=4 → 4', () => {
			expect(
				calculateNumAportes({
					termYears: 4,
					periodicityName: 'Anual',
					companyName: null,
					productName: null,
				}),
			).toBe(4)
		})

		it('Trimestral, term=5 → 20', () => {
			expect(
				calculateNumAportes({
					termYears: 5,
					periodicityName: 'Trimestral',
					companyName: null,
					productName: null,
				}),
			).toBe(20)
		})

		it('Bimensual, term=6 → 36', () => {
			expect(
				calculateNumAportes({
					termYears: 6,
					periodicityName: 'Bimensual',
					companyName: null,
					productName: null,
				}),
			).toBe(36)
		})

		it('Cuatrimestral, term=3 → 9', () => {
			expect(
				calculateNumAportes({
					termYears: 3,
					periodicityName: 'Cuatrimestral',
					companyName: null,
					productName: null,
				}),
			).toBe(9)
		})
	})
})
