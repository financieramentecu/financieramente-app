import { describe, it, expect } from 'vitest'
import { fondearAnualidadesBodySchema } from '../fondear-anualidades.schema'

describe('fondearAnualidadesBodySchema', () => {
	it('rechaza array vacío', () => {
		const r = fondearAnualidadesBodySchema.safeParse({
			fundedInstallmentIndexes: [],
		})
		expect(r.success).toBe(false)
	})

	it('rechaza índice no entero / negativo', () => {
		const r = fondearAnualidadesBodySchema.safeParse({
			fundedInstallmentIndexes: [0],
		})
		expect(r.success).toBe(false)
	})

	it('acepta índices y deduplica', () => {
		const r = fondearAnualidadesBodySchema.safeParse({
			fundedInstallmentIndexes: [2, 2, 1],
		})
		expect(r.success).toBe(true)
		if (r.success) {
			expect(r.data.fundedInstallmentIndexes).toEqual([2, 1])
		}
	})
})

describe('fondearAnualidadesBodySchema — fundedDate (optional)', () => {
	it('accepts a valid YYYY-MM-DD fundedDate', () => {
		const r = fondearAnualidadesBodySchema.safeParse({
			fundedInstallmentIndexes: [1],
			fundedDate: '2026-07-01',
		})
		expect(r.success).toBe(true)
		if (r.success) {
			expect(r.data.fundedDate).toBe('2026-07-01')
		}
	})

	it('accepts missing fundedDate (optional field)', () => {
		const r = fondearAnualidadesBodySchema.safeParse({
			fundedInstallmentIndexes: [2],
		})
		expect(r.success).toBe(true)
		if (r.success) {
			expect(r.data.fundedDate).toBeUndefined()
		}
	})

	it('rejects fundedDate with wrong format (YYYY/MM/DD)', () => {
		const r = fondearAnualidadesBodySchema.safeParse({
			fundedInstallmentIndexes: [1],
			fundedDate: '2026/07/01',
		})
		expect(r.success).toBe(false)
	})

	it('rejects fundedDate that is not a date string (number)', () => {
		const r = fondearAnualidadesBodySchema.safeParse({
			fundedInstallmentIndexes: [1],
			fundedDate: 20260701,
		})
		expect(r.success).toBe(false)
	})
})
