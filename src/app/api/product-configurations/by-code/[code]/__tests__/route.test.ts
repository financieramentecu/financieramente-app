import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import type { ProductConfiguration } from '@/features/product-configuration/types/product-configuration.types'

const getProductConfigurationByCode = vi.fn()

vi.mock(
	'@/features/product-configuration/services/product-configuration.service',
	() => ({
		getProductConfigurationByCode: (...args: unknown[]) =>
			getProductConfigurationByCode(...args),
	})
)

describe('GET /api/product-configurations/by-code/[code]', () => {
	beforeEach(() => {
		getProductConfigurationByCode.mockReset()
	})

	it('returns 404 when service returns null', async () => {
		getProductConfigurationByCode.mockResolvedValueOnce(null)

		const res = await GET(new Request('http://localhost'), {
			params: Promise.resolve({ code: 'UNKNOWN' }),
		})

		expect(res.status).toBe(404)
		const body = await res.json()
		expect(body.data).toBeNull()
		expect(body.error).toBeTruthy()
	})

	it('returns 200 with configuration when found', async () => {
		const cfg = {
			id: 1,
			code: 'A-B-C',
		} as unknown as ProductConfiguration

		getProductConfigurationByCode.mockResolvedValueOnce(cfg)

		const res = await GET(new Request('http://localhost'), {
			params: Promise.resolve({ code: 'A-B-C' }),
		})

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.data).toEqual(cfg)
	})

	it('decodes encoded route param before lookup (e.g. + in product code)', async () => {
		const cfg = {
			id: 2,
			code: 'C+S-PROPIO-JUNIOR',
		} as unknown as ProductConfiguration

		getProductConfigurationByCode.mockResolvedValueOnce(cfg)

		const res = await GET(new Request('http://localhost'), {
			params: Promise.resolve({ code: 'C%2BS-PROPIO-JUNIOR' }),
		})

		expect(res.status).toBe(200)
		expect(getProductConfigurationByCode).toHaveBeenCalledWith(
			'C+S-PROPIO-JUNIOR'
		)
		const body = await res.json()
		expect(body.data).toEqual(cfg)
	})
})
