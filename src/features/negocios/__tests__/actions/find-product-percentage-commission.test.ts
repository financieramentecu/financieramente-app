import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findProductPercentageCommission } from '@/features/negocios/actions/find-product-percentage-commission'
import { getPpcForNewBusinesses } from '@/features/negocios/services/product-configuration.service'

vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	getPpcForNewBusinesses: vi.fn(),
}))

describe('findProductPercentageCommission', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns ppc data when service resolves fallback with no specific config', async () => {
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: false,
			ppc: {
				idProductPercentageCommission: 99,
			},
		} as Awaited<ReturnType<typeof getPpcForNewBusinesses>>)

		const result = await findProductPercentageCommission({
			idCategory: 1,
			idClientOrigin: 2,
			idProduct: 3,
		})

		expect(result).toEqual({
			data: {
				idProductPercentageCommission: 99,
			},
		})
	})

	it('returns specific-config error when no config and no fallback ppc', async () => {
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: false,
			ppc: null,
		})

		const result = await findProductPercentageCommission({
			idCategory: 1,
			idClientOrigin: 2,
			idProduct: 3,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toContain('No hay configuración')
	})

	it('returns new-business-config error when config exists but no ppc', async () => {
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: true,
			ppc: null,
		})

		const result = await findProductPercentageCommission({
			idCategory: 1,
			idClientOrigin: 2,
			idProduct: 3,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toContain('nuevos negocios')
	})
})
