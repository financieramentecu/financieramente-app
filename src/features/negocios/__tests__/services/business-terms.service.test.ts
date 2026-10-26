import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listDistinctTerms } from '@/features/negocios/services/business-terms.service'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
	prisma: { business: { findMany: vi.fn() } },
}))

describe('listDistinctTerms', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.business.findMany).mockResolvedValue([
			{ term: 1 },
			{ term: 5 },
		] as never)
	})

	it('is unscoped by default', async () => {
		expect(await listDistinctTerms()).toEqual([1, 5])
		expect(prisma.business.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { term: { not: null } } })
		)
	})

	it('restricts to the given owners (PARTNER own data)', async () => {
		await listDistinctTerms({ ownerIds: [77] })
		expect(prisma.business.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { term: { not: null }, idUser: { in: [77] } },
			})
		)
	})
})
