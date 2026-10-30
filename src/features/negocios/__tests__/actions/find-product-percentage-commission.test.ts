import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findProductPercentageCommission } from '@/features/negocios/actions/find-product-percentage-commission'
import { requireActionPermission } from '@/lib/auth/require-action-permission'
import { getPpcForNewBusinesses } from '@/features/negocios/services/product-configuration.service'

vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	getPpcForNewBusinesses: vi.fn(),
}))

vi.mock('@/lib/auth/require-action-permission', () => ({
	requireActionPermission: vi.fn(),
}))

describe('findProductPercentageCommission', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireActionPermission).mockResolvedValue({
			ok: true,
			session: { user: { role: 'AGENTE' } },
		} as never)
	})

	it('refuses an anonymous caller without querying the service (SEC-03)', async () => {
		vi.mocked(requireActionPermission).mockResolvedValue({
			ok: false,
			error: 'No autorizado',
		})

		const result = await findProductPercentageCommission({
			idLevel: 1,
			idProduct: 3,
		})

		expect(result).toEqual({ data: null, error: 'No autorizado' })
		expect(getPpcForNewBusinesses).not.toHaveBeenCalled()
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
