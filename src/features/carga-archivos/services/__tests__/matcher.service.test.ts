/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { findBusinessByContract } from '../matcher.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
		},
	},
}))

describe('findBusinessByContract', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should return null if contract is empty', async () => {
		const result = await findBusinessByContract('')
		expect(result).toBeNull()
		expect(prisma.business.findFirst).not.toHaveBeenCalled()
	})

	it('should call prisma findFirst with correct where clause', async () => {
		const contract = 'CTO123'
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: 1, createdAt: new Date() } as any)

		await findBusinessByContract(contract)

		expect(prisma.business.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { contract },
			})
		)
	})
})
