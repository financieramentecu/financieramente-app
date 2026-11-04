import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { searchPolicyholdersByDocument } from '@/features/policyholders/services/policyholder.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		policyholder: { findMany: vi.fn() },
		client: { findMany: vi.fn() },
	},
}))

describe('searchPolicyholdersByDocument', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.policyholder.findMany).mockResolvedValue([])
	})

	it('searches only the policyholder table', async () => {
		await searchPolicyholdersByDocument('12345', 10)

		expect(prisma.policyholder.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					active: true,
					identityNumber: { contains: '12345', mode: 'insensitive' },
				},
			})
		)
		expect(prisma.client.findMany).not.toHaveBeenCalled()
	})
})
