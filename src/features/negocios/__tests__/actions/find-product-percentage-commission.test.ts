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

	it('returns ppc data when service returns config with ppc', async () => {
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: true,
			ppc: {
				idProductPercentageCommission: 99,
			},
		} as Awaited<ReturnType<typeof getPpcForNewBusinesses>>)

		const result = await findProductPercentageCommission({
			idLevel: 1,
			idProduct: 3,
		})

		expect(result).toEqual({
			data: {
				idProductPercentageCommission: 99,
			},
		})
	})

	it('propagates descriptive error message when service throws (no config found)', async () => {
		const errorMsg =
			'No existe configuración de distribución para el producto y categoría seleccionados. Configurá la distribución antes de continuar.'
		vi.mocked(getPpcForNewBusinesses).mockRejectedValue(new Error(errorMsg))

		const result = await findProductPercentageCommission({
			idLevel: 99,
			idProduct: 3,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(errorMsg)
	})

	it('returns new-business-config error when config exists but no ppc', async () => {
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: true,
			ppc: null,
		})

		const result = await findProductPercentageCommission({
			idLevel: 1,
			idProduct: 3,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toContain('nuevos negocios')
	})
})
