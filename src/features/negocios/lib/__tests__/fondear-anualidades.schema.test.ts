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
