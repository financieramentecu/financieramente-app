/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getBusinessById } from '../../services/business.service'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
		},
	},
}))

describe('getBusinessById', () => {
	const mockUser = {
		idUser: 1,
		role: { code: UserRole.AGENTE },
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should call prisma.business.findFirst with correct where clause for agent', async () => {
		const mockBusinessId = 123
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: mockBusinessId } as any)

		await getBusinessById(mockBusinessId, mockUser as any)

		expect(prisma.business.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idBusiness: mockBusinessId, idUser: mockUser.idUser },
			})
		)
	})

	it('should call prisma.business.findFirst with correct where clause for non-agent', async () => {
		const mockBusinessId = 123
		const adminUser = { ...mockUser, role: { code: UserRole.ADMIN } }
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: mockBusinessId } as any)

		await getBusinessById(mockBusinessId, adminUser as any)

		expect(prisma.business.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idBusiness: mockBusinessId },
			})
		)
	})

	it('should return null if business is not found', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue(null)
		const result = await getBusinessById(123, mockUser as any)
		expect(result).toBeNull()
	})
})
