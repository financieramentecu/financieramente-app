import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
	validateUserById: vi.fn(),
	validateUserByEmail: vi.fn(),
	getSessionUserState: vi.fn(),
}))

vi.mock('@/features/auth/lib/user-validation', () => ({
	validateUserById: mocks.validateUserById,
	validateUserByEmail: mocks.validateUserByEmail,
	validateUserCredentials: vi.fn(),
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

type JwtArgs = Parameters<
	NonNullable<NonNullable<typeof authConfig.callbacks>['jwt']>
>[0]

function runJwt(args: Record<string, unknown>) {
	return authConfig.callbacks!.jwt!(
		args as unknown as JwtArgs
	) as Promise<Record<string, unknown> | null>
}

const activeState = (roleCode: string) => ({ active: true, roleCode })
const inactiveState = (roleCode: string) => ({ active: false, roleCode })

/** Maps user ids to DB states for the revalidation read. */
function stubStates(
	states: Record<number, ReturnType<typeof activeState> | null>
) {
	mocks.getSessionUserState.mockImplementation(async (id: number) =>
		id in states ? states[id] : null
	)
}

const adminToken = () => ({
	userId: 1,
	email: 'admin@x.com',
	name: 'Admin',
	role: 'ADMIN',
})

const impersonatingToken = () => ({
	userId: 5,
	email: 'partner@x.com',
	name: 'Partner',
	role: 'PARTNER',
	originalUserId: 1,
	originalRole: 'ADMIN',
	originalEmail: 'admin@x.com',
	originalName: 'Admin',
})

describe('authConfig jwt callback - per-request revalidation (SEC-01)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null (ends the session) when the user was deactivated', async () => {
		stubStates({ 7: inactiveState('PARTNER') })
		const result = await runJwt({
			token: { userId: 7, email: 'a@x.com', role: 'PARTNER' },
		})
		expect(result).toBeNull()
	})

	it('returns null when the user no longer exists', async () => {
		stubStates({})
		const result = await runJwt({
			token: { userId: 7, email: 'a@x.com', role: 'AGENTE' },
		})
		expect(result).toBeNull()
	})

	it('keeps the session and refreshes role and permissions from the database', async () => {
		stubStates({ 7: activeState('CONSULTOR') })
		const result = await runJwt({
			token: { userId: 7, email: 'a@x.com', role: 'AGENTE' },
		})
		expect(result).toMatchObject({ userId: 7, role: 'CONSULTOR' })
		expect(result?.permissions).toBeTruthy()
	})

	it('reads the user state exactly once for a plain session', async () => {
		stubStates({ 7: activeState('AGENTE') })
		await runJwt({ token: { userId: 7, email: 'a@x.com', role: 'AGENTE' } })
		expect(mocks.getSessionUserState).toHaveBeenCalledTimes(1)
		expect(mocks.getSessionUserState).toHaveBeenCalledWith(7)
	})

	it('does not require activatedAt: a pending partner session is kept', async () => {
		// The service state has no activation field at all
		stubStates({ 9: activeState('PARTNER') })
		const result = await runJwt({
			token: { userId: 9, email: 'p@x.com', role: 'PARTNER' },
		})
		expect(result).toMatchObject({ userId: 9, role: 'PARTNER' })
	})

	it('skips the database read for a token without a user id', async () => {
		mocks.validateUserByEmail.mockResolvedValue({ isValid: false, user: null })
		const result = await runJwt({ token: { email: 'a@x.com' } })
		expect(mocks.getSessionUserState).not.toHaveBeenCalled()
		expect(result).toMatchObject({ email: 'a@x.com' })
	})

	it('keeps the token when the revalidation read fails (no logout on a database blip)', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		mocks.getSessionUserState.mockRejectedValue(new Error('db down'))
		const token = { userId: 7, email: 'a@x.com', role: 'AGENTE' }
		const result = await runJwt({ token })
		expect(result).toMatchObject({ userId: 7, role: 'AGENTE' })
		spy.mockRestore()
	})
})

describe('authConfig jwt callback - impersonation while revalidating', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('restores the admin session when the impersonated target is deactivated', async () => {
		stubStates({ 5: inactiveState('PARTNER'), 1: activeState('ADMIN') })
		const result = await runJwt({ token: impersonatingToken() })
		expect(result).toMatchObject({
			userId: 1,
			role: 'ADMIN',
			email: 'admin@x.com',
			name: 'Admin',
		})
		expect(result).not.toHaveProperty('originalUserId')
		expect(result).not.toHaveProperty('originalRole')
	})

	it('ends the session when the impersonating admin was deactivated', async () => {
		stubStates({ 5: activeState('PARTNER'), 1: inactiveState('ADMIN') })
		await expect(runJwt({ token: impersonatingToken() })).resolves.toBeNull()
	})

	it('ends the session when the original user is no longer an ADMIN', async () => {
		stubStates({ 5: activeState('PARTNER'), 1: activeState('AGENTE') })
		await expect(runJwt({ token: impersonatingToken() })).resolves.toBeNull()
	})

	it('keeps the impersonation while both users are active', async () => {
		stubStates({ 5: activeState('PARTNER'), 1: activeState('ADMIN') })
		const result = await runJwt({ token: impersonatingToken() })
		expect(result).toMatchObject({
			userId: 5,
			role: 'PARTNER',
			originalUserId: 1,
		})
	})
})

describe('authConfig jwt callback - existing "Ver como" behavior', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('starts impersonation of an active non-admin target (also a pending partner)', async () => {
		stubStates({ 1: activeState('ADMIN'), 5: activeState('PARTNER') })
		mocks.validateUserById.mockResolvedValue({
			isValid: true,
			user: {
				id: 5,
				email: 'partner@x.com',
				name: 'Partner',
				active: true,
				role: 'PARTNER',
			},
		})
		const result = await runJwt({
			token: adminToken(),
			trigger: 'update',
			session: { impersonateUserId: '5' },
		})
		expect(result).toMatchObject({
			userId: 5,
			role: 'PARTNER',
			email: 'partner@x.com',
			originalUserId: 1,
			originalRole: 'ADMIN',
			originalEmail: 'admin@x.com',
			originalName: 'Admin',
		})
	})

	it('refuses to start impersonating a deactivated target and keeps the admin', async () => {
		stubStates({ 1: activeState('ADMIN') })
		mocks.validateUserById.mockResolvedValue({
			isValid: false,
			user: null,
			error: 'USER_INACTIVE',
		})
		const result = await runJwt({
			token: adminToken(),
			trigger: 'update',
			session: { impersonateUserId: '5' },
		})
		expect(result).toMatchObject({ userId: 1, role: 'ADMIN' })
		expect(result).not.toHaveProperty('originalUserId')
	})

	it('blocks impersonating another ADMIN', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		stubStates({ 1: activeState('ADMIN') })
		mocks.validateUserById.mockResolvedValue({
			isValid: true,
			user: { id: 2, email: 'b@x.com', name: 'B', active: true, role: 'ADMIN' },
		})
		const result = await runJwt({
			token: adminToken(),
			trigger: 'update',
			session: { impersonateUserId: '2' },
		})
		expect(result).toMatchObject({ userId: 1, role: 'ADMIN' })
		warn.mockRestore()
	})

	it('ignores an impersonation request from a non-admin', async () => {
		stubStates({ 7: activeState('AGENTE') })
		const result = await runJwt({
			token: { userId: 7, email: 'a@x.com', name: 'A', role: 'AGENTE' },
			trigger: 'update',
			session: { impersonateUserId: '5' },
		})
		expect(mocks.validateUserById).not.toHaveBeenCalled()
		expect(result).toMatchObject({ userId: 7, role: 'AGENTE' })
	})

	it('STOP restores the admin session and clears the original fields', async () => {
		stubStates({ 1: activeState('ADMIN') })
		const result = await runJwt({
			token: impersonatingToken(),
			trigger: 'update',
			session: { impersonateUserId: 'STOP' },
		})
		expect(result).toMatchObject({
			userId: 1,
			role: 'ADMIN',
			email: 'admin@x.com',
			name: 'Admin',
		})
		expect(result).not.toHaveProperty('originalUserId')
	})

	it('populates the token on first sign-in from the user object', async () => {
		stubStates({ 3: activeState('AGENTE') })
		const result = await runJwt({
			token: {},
			user: {
				id: '3',
				email: 'n@x.com',
				name: 'N',
				image: null,
				role: 'AGENTE',
			},
		})
		expect(result).toMatchObject({
			userId: 3,
			email: 'n@x.com',
			role: 'AGENTE',
		})
	})
})
