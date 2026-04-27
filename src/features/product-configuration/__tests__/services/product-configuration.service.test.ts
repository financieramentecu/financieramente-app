import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	getProductConfigurationByCode,
	getProductConfigurationIdsWithCategoryLines,
	isDistributionSetupComplete,
} from '@/features/product-configuration/services/product-configuration.service'

const { findUnique, count, findMany } = vi.hoisted(() => ({
	findUnique: vi.fn(),
	count: vi.fn(),
	findMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productConfiguration: {
			findUnique,
		},
		productPercentageCommissionCategory: {
			count,
			findMany,
		},
	},
}))

describe('getProductConfigurationByCode', () => {
	beforeEach(() => {
		findUnique.mockReset()
		count.mockReset()
		findMany.mockReset()
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

describe('isDistributionSetupComplete', () => {
	beforeEach(() => {
		count.mockReset()
		findMany.mockReset()
	})

	it('returns false when count is 0', async () => {
		count.mockResolvedValueOnce(0)
		const r = await isDistributionSetupComplete(10)
		expect(r).toBe(false)
		expect(count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					productPercentageCommission: {
						idProductConfiguration: 10,
					},
				},
			})
		)
	})

	it('returns true when count is positive', async () => {
		count.mockResolvedValueOnce(2)
		const r = await isDistributionSetupComplete(10)
		expect(r).toBe(true)
	})
})

describe('getProductConfigurationIdsWithCategoryLines', () => {
	beforeEach(() => {
		findMany.mockReset()
	})

	it('returns empty set for empty ids', async () => {
		const r = await getProductConfigurationIdsWithCategoryLines([])
		expect(r.size).toBe(0)
		expect(findMany).not.toHaveBeenCalled()
	})

	it('returns distinct configuration ids from rows', async () => {
		findMany.mockResolvedValueOnce([
			{
				productPercentageCommission: { idProductConfiguration: 1 },
			},
			{
				productPercentageCommission: { idProductConfiguration: 1 },
			},
			{
				productPercentageCommission: { idProductConfiguration: 2 },
			},
		])
		const r = await getProductConfigurationIdsWithCategoryLines([1, 2, 3])
		expect(r.has(1)).toBe(true)
		expect(r.has(2)).toBe(true)
		expect(r.has(3)).toBe(false)
	})
})
