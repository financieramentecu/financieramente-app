import { describe, it, expect } from 'vitest'
import { businessAccessDeniedResponse } from '@/features/negocios/lib/business-access-http'

describe('businessAccessDeniedResponse', () => {
	it('maps FORBIDDEN to 403 "Sin permisos"', async () => {
		const res = businessAccessDeniedResponse('FORBIDDEN')
		expect(res.status).toBe(403)
		expect(await res.json()).toEqual({ data: null, error: 'Sin permisos' })
	})

	it('maps NOT_FOUND to 404 "Negocio no encontrado"', async () => {
		const res = businessAccessDeniedResponse('NOT_FOUND')
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({
			data: null,
			error: 'Negocio no encontrado',
		})
	})
})
