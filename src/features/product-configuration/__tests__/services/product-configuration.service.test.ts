import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProductConfigurationByCode } from '@/features/product-configuration/services/product-configuration.service'

const { findUnique } = vi.hoisted(() => ({
	findUnique: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productConfiguration: {
			findUnique,
		},
	},
}))

describe('getProductConfigurationByCode', () => {
	beforeEach(() => {
		findUnique.mockReset()
	})

	it('returns null for blank code', async () => {
		const r = await getProductConfigurationByCode('   ')
		expect(r).toBeNull()
		expect(findUnique).not.toHaveBeenCalled()
	})

	it('returns mapped config when prisma finds a row', async () => {
		findUnique.mockResolvedValueOnce({
			id: 5,
			idProduct: 1,
			idClientOrigin: 2,
			idCategory: 3,
			code: 'P-O-C',
			active: true,
			idProductPercentageCommissionNewBusinesses: null,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
			product: {
				idProduct: 1,
				name: 'Prod',
				company: { idCompany: 1, name: 'Co' },
			},
			clientOrigin: { idClientOrigin: 2, name: 'Or' },
			category: { idCategory: 3, name: 'Cat' },
			productPercentageCommissionNewBusinesses: null,
			productPercentageCommissions: [],
		})

		const r = await getProductConfigurationByCode('P-O-C')
		expect(r).not.toBeNull()
		expect(r?.id).toBe(5)
		expect(r?.code).toBe('P-O-C')
		expect(findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { code: 'P-O-C' },
			})
		)
	})

	it('returns null when prisma returns null', async () => {
		findUnique.mockResolvedValueOnce(null)
		const r = await getProductConfigurationByCode('MISSING')
		expect(r).toBeNull()
	})
})
