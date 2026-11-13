import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
	SEEDED_USER_EMAILS,
	activateSeededUsers,
	superAdminUser,
} from '../user'

describe('seeded accounts are activated', () => {
	it('includes the default Super Admin account', () => {
		expect(superAdminUser.email).toBe('admin@financieramentecu.com')
		expect(SEEDED_USER_EMAILS).toContain('admin@financieramentecu.com')
	})

	it('only fills activatedAt where it is empty, for seeded emails only', async () => {
		const updateMany = vi.fn().mockResolvedValue({ count: 3 })
		const prisma = { user: { updateMany } } as unknown as PrismaClient

		await activateSeededUsers(prisma)

		expect(updateMany).toHaveBeenCalledTimes(1)
		const arg = updateMany.mock.calls[0][0]
		expect(arg.where).toEqual({
			email: { in: [...SEEDED_USER_EMAILS] },
			activatedAt: null,
		})
		expect(arg.data.activatedAt).toBeInstanceOf(Date)
	})
})
