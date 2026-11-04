import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	validateUserByEmail,
	validateUserById,
	validateUserCredentials,
} from '../lib/user-validation'
import { UserRole } from '../lib/roles'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
	prisma: { user: { findUnique: vi.fn() } },
}))

vi.mock('../lib/password-utils', () => ({
	verifyPassword: vi.fn().mockResolvedValue(true),
}))

function buildUser(
	overrides: { roleCode?: UserRole; activatedAt?: Date | null } = {}
) {
	const roleCode = overrides.roleCode ?? UserRole.PARTNER
	return {
		idUser: 10,
		name: 'Partner',
		lastName: 'External',
		email: 'partner@example.com',
		password: '$2a$10$hash',
		ssoOnly: false,
		activatedAt:
			'activatedAt' in overrides ? overrides.activatedAt : new Date(),
		active: true,
		idRole: 9,
		role: { idRole: 9, code: roleCode, name: roleCode },
	} as never
}

describe('login activation gates (AA-01, AA-09)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('validateUserCredentials', () => {
		it('allows an activated PARTNER with a password', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(buildUser())
			const result = await validateUserCredentials('partner@example.com', 'x')
			expect(result.isValid).toBe(true)
			expect(result.user?.role).toBe(UserRole.PARTNER)
		})

		it('rejects a PARTNER that is still pending activation', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
				buildUser({ activatedAt: null })
			)
			const result = await validateUserCredentials('partner@example.com', 'x')
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
		})

		it.each([UserRole.ADMIN, UserRole.AGENTE])(
			'rejects a pending %s as well (universal rule)',
			async (roleCode) => {
				vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
					buildUser({ roleCode, activatedAt: null })
				)
				const result = await validateUserCredentials('a@example.com', 'x')
				expect(result.isValid).toBe(false)
			}
		)

		it('does not verify the password for a pending user', async () => {
			const { verifyPassword } = await import('../lib/password-utils')
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
				buildUser({ activatedAt: null })
			)
			await validateUserCredentials('partner@example.com', 'x')
			expect(verifyPassword).not.toHaveBeenCalled()
		})

		it('still rejects other internal roles with a password', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
				buildUser({ roleCode: UserRole.ANALISTA_SOPORTE })
			)
			const result = await validateUserCredentials('a@example.com', 'x')
			expect(result.isValid).toBe(false)
		})
	})

	describe('validateUserByEmail', () => {
		it('allows an activated user', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(buildUser())
			expect((await validateUserByEmail('partner@example.com')).isValid).toBe(
				true
			)
		})

		it('rejects a pending user', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
				buildUser({ activatedAt: null })
			)
			const result = await validateUserByEmail('partner@example.com')
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
		})
	})

	describe('validateUserById (impersonation)', () => {
		it('keeps a pending partner impersonable (product decision PA-08)', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
				buildUser({ activatedAt: null })
			)
			const result = await validateUserById(10)
			expect(result.isValid).toBe(true)
			expect(result.user?.role).toBe(UserRole.PARTNER)
		})
	})
})
