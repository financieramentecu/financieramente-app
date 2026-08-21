import { describe, it, expect } from 'vitest'
import { manageNovedadSchema } from '@/features/negocios/lib/business-api.schemas'

describe('manageNovedadSchema', () => {
	it.each(['SOMETIDA_DEVOLUCION', 'DECLINADA', 'PENDIENTE', 'CANCELADA'])(
		'accepts manual status %s',
		(novedadStatus) => {
			const result = manageNovedadSchema.safeParse({ novedadStatus })
			expect(result.success).toBe(true)
		}
	)

	it('rejects NUEVA (never manually settable)', () => {
		const result = manageNovedadSchema.safeParse({ novedadStatus: 'NUEVA' })
		expect(result.success).toBe(false)
	})

	it('rejects an unknown status string', () => {
		const result = manageNovedadSchema.safeParse({ novedadStatus: 'BOGUS' })
		expect(result.success).toBe(false)
	})

	it('rejects a missing body', () => {
		const result = manageNovedadSchema.safeParse({})
		expect(result.success).toBe(false)
	})
})
