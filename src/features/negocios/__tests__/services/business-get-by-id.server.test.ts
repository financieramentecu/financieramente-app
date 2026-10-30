/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

import { prisma } from '@/lib/prisma'
import { getBusinessById } from '@/features/negocios/services/business-get-by-id.server'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
		},
		user: {
			findMany: vi.fn().mockResolvedValue([
				{ idUser: 1, idUserLeader: null },
				{ idUser: 2, idUserLeader: 1 },
			]),
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

	it('write mode: agent is limited to own businesses (owner-only, same as PUT)', async () => {
		const mockBusinessId = 123
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: mockBusinessId } as any)

		await getBusinessById(mockBusinessId, mockUser as any, 'write')

		expect(prisma.business.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idBusiness: mockBusinessId, idUser: { in: [mockUser.idUser] } },
			})
		)
	})

	it('read mode (default): agent sees self plus subordinates', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: 123 } as any)

		await getBusinessById(123, mockUser as any)

		expect(prisma.business.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idBusiness: 123, idUser: { in: [1, 2] } },
			})
		)
	})

	it('partner is limited to own businesses in both modes', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: 123 } as any)
		const partner = { idUser: 10, role: { code: UserRole.PARTNER } }

		await getBusinessById(123, partner as any)
		await getBusinessById(123, partner as any, 'write')

		for (const call of vi.mocked(prisma.business.findFirst).mock.calls) {
			expect(call[0]?.where).toEqual({ idBusiness: 123, idUser: { in: [10] } })
		}
	})

	it('read-only role: read sees any business, write returns null without querying', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: 123 } as any)
		const consultor = { idUser: 5, role: { code: UserRole.CONSULTOR } }

		await getBusinessById(123, consultor as any)
		expect(prisma.business.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idBusiness: 123 } })
		)

		vi.mocked(prisma.business.findFirst).mockClear()
		expect(await getBusinessById(123, consultor as any, 'write')).toBeNull()
		expect(prisma.business.findFirst).not.toHaveBeenCalled()
	})

	it('unknown or missing role fails closed without querying', async () => {
		for (const role of [{ code: 'SOMETHING_NEW' }, { code: UserRole.DEFAULT }, null]) {
			expect(await getBusinessById(123, { idUser: 1, role } as any)).toBeNull()
		}
		expect(prisma.business.findFirst).not.toHaveBeenCalled()
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
