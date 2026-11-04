import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/nextauth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
	prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}))
vi.mock('@/features/auth/lib/password-utils', () => ({
	hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
	validatePasswordStrength: vi.fn(() => ({ isValid: true })),
}))

import { POST } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'

function request(body: unknown) {
	return new Request('http://localhost/api/admin/users/set-password', {
		method: 'POST',
		body: JSON.stringify(body),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({
		user: { id: '1', role: 'ADMIN' },
	} as never)
})

describe('POST /api/admin/users/set-password — partner guard', () => {
	it('refuses to set a password on a partner and points to the Partners module', async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 20,
			role: { code: 'PARTNER' },
			level: { code: 'PARTNER_EXTERNAL' },
		} as never)

		const response = await POST(
			request({ userId: 20, password: 'abcd1234', ssoOnly: false })
		)
		const json = await response.json()

		expect(response.status).toBe(403)
		expect(json.error).toContain('módulo Partners')
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('still sets the password of an ADMIN target (regression)', async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 2,
			role: { code: 'ADMIN' },
			level: null,
		} as never)
		vi.mocked(prisma.user.update).mockResolvedValue({} as never)

		const response = await POST(
			request({ userId: 2, password: 'abcd1234', ssoOnly: false })
		)

		expect(response.status).toBe(200)
		expect(prisma.user.update).toHaveBeenCalled()
	})
})
