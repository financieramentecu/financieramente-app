import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getSessionUserState } from '../session-user.service'

vi.mock('@/lib/prisma', () => ({
	prisma: { user: { findUnique: vi.fn() } },
}))

const findUnique = vi.mocked(prisma.user.findUnique)

describe('getSessionUserState', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when the user does not exist', async () => {
		findUnique.mockResolvedValue(null)
		await expect(getSessionUserState(99)).resolves.toBeNull()
	})

	it('maps active and the role code', async () => {
		findUnique.mockResolvedValue({
			active: true,
			role: { code: 'PARTNER' },
		} as never)
		await expect(getSessionUserState(7)).resolves.toEqual({
			active: true,
			roleCode: 'PARTNER',
			canViewOthersCrm: undefined,
		})
	})

	it('maps a missing role to a null role code and keeps inactive users', async () => {
		findUnique.mockResolvedValue({ active: false, role: null } as never)
		await expect(getSessionUserState(7)).resolves.toEqual({
			active: false,
			roleCode: null,
			canViewOthersCrm: undefined,
		})
	})

	it('performs a single primary-key read selecting only active and role code', async () => {
		findUnique.mockResolvedValue(null)
		await getSessionUserState(5)
		expect(findUnique).toHaveBeenCalledTimes(1)
		expect(findUnique).toHaveBeenCalledWith({
			where: { idUser: 5 },
			select: { active: true, canViewOthersCrm: true, role: { select: { code: true } } },
		})
	})
})
