import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
	findUnique: vi.fn(),
	getSessionUserState: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: { user: { findUnique: mocks.findUnique } },
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {},
}))
vi.mock('@/features/auth/lib/user-creation', () => ({
	createUserAutomatically: vi.fn(),
}))
vi.mock('@/features/auth/services/session-user.service', () => ({
	getSessionUserState: mocks.getSessionUserState,
}))

import { authConfig } from '../config'
import { validateUserById } from '@/features/auth/lib/user-validation'

type JwtArgs = Parameters<
	NonNullable<NonNullable<typeof authConfig.callbacks>['jwt']>
>[0]

function runJwt(args: Record<string, unknown>) {
	return authConfig.callbacks!.jwt!(
		args as unknown as JwtArgs
	) as Promise<Record<string, unknown> | null>
}

function partnerRow(
	overrides: { active?: boolean; activatedAt?: Date | null } = {}
) {
	return {
		idUser: 5,
		name: 'Pending Partner',
		email: 'pending@partner.com',
		active: overrides.active ?? true,
		activatedAt: 'activatedAt' in overrides ? overrides.activatedAt : null,
		role: { code: 'PARTNER' },
	}
}

const adminToken = () => ({
	userId: 1,
	email: 'admin@x.com',
	name: 'Admin',
	role: 'ADMIN',
})

beforeEach(() => {
	vi.clearAllMocks()
	mocks.getSessionUserState.mockImplementation(async (id: number) =>
		id === 1
			? { active: true, roleCode: 'ADMIN' }
			: { active: true, roleCode: 'PARTNER' }
	)
})

describe('validateUserById ignores activatedAt (PA-08)', () => {
	it.each([
		['never activated', null],
		['activated', new Date('2026-10-01T00:00:00Z')],
	])('accepts an active partner who is %s', async (_label, activatedAt) => {
		mocks.findUnique.mockResolvedValue(partnerRow({ activatedAt }))
		const result = await validateUserById(5)
		expect(result.isValid).toBe(true)
		expect(result.user?.role).toBe('PARTNER')
	})

	it('looks the user up by primary key only (no activation filter)', async () => {
		mocks.findUnique.mockResolvedValue(partnerRow())
		await validateUserById(5)
		const query = mocks.findUnique.mock.calls[0][0]
		expect(query.where).toEqual({ idUser: 5 })
		expect(JSON.stringify(query)).not.toContain('activatedAt')
	})

	it.each([
		['never activated', null],
		['activated', new Date('2026-10-01T00:00:00Z')],
	])(
		'still blocks a deactivated partner who is %s',
		async (_label, activatedAt) => {
			mocks.findUnique.mockResolvedValue(
				partnerRow({ active: false, activatedAt })
			)
			const result = await validateUserById(5)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('USER_INACTIVE')
		}
	)
})

describe('"Ver como" through the jwt callback', () => {
	it('lets an ADMIN impersonate a PENDING partner (active, activatedAt null)', async () => {
		mocks.findUnique.mockResolvedValue(partnerRow({ activatedAt: null }))
		const result = await runJwt({
			token: adminToken(),
			trigger: 'update',
			session: { impersonateUserId: '5' },
		})
		expect(result).toMatchObject({
			userId: 5,
			role: 'PARTNER',
			originalUserId: 1,
			originalRole: 'ADMIN',
		})
	})

	it('keeps the admin session when the target partner is deactivated', async () => {
		mocks.findUnique.mockResolvedValue(
			partnerRow({ active: false, activatedAt: null })
		)
		const result = await runJwt({
			token: adminToken(),
			trigger: 'update',
			session: { impersonateUserId: '5' },
		})
		expect(result).toMatchObject({ userId: 1, role: 'ADMIN' })
		expect(result).not.toHaveProperty('originalUserId')
	})

	it('does not end an already-running impersonation of a pending partner on revalidation', async () => {
		const result = await runJwt({
			token: {
				userId: 5,
				email: 'pending@partner.com',
				name: 'Pending Partner',
				role: 'PARTNER',
				originalUserId: 1,
				originalRole: 'ADMIN',
				originalEmail: 'admin@x.com',
				originalName: 'Admin',
			},
		})
		expect(result).toMatchObject({
			userId: 5,
			role: 'PARTNER',
			originalUserId: 1,
		})
	})
})
