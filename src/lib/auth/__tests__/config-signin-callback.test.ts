import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
	validateUserByEmail: vi.fn(),
	logAuditEvent: vi.fn(),
	createUserAutomatically: vi.fn(),
}))

vi.mock('@/features/auth/lib/user-validation', () => ({
	validateUserById: vi.fn(),
	validateUserByEmail: mocks.validateUserByEmail,
	validateUserCredentials: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: mocks.logAuditEvent,
	AuditAction: {
		ACCESS_DENIED: 'ACCESS_DENIED',
		INVALID_DOMAIN: 'INVALID_DOMAIN',
		ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
		USER_CREATION_ERROR: 'USER_CREATION_ERROR',
		LOGIN: 'LOGIN',
	},
}))
vi.mock('@/features/auth/lib/user-creation', () => ({
	createUserAutomatically: mocks.createUserAutomatically,
}))
vi.mock('@/features/auth/services/session-user.service', () => ({
	getSessionUserState: vi.fn(),
}))

import { authConfig } from '../config'

type SignIn = NonNullable<typeof authConfig.callbacks>['signIn']
type SignInArgs = Parameters<NonNullable<SignIn>>[0]

function getSignIn(): SignIn {
	return authConfig.callbacks!.signIn!
}

/** Builds a minimal signIn callback payload; only the fields it reads matter. */
function signInArgs(input: {
	email: string
	provider: string
	role?: string
}): SignInArgs {
	return {
		user: { id: '1', email: input.email, role: input.role },
		account: {
			provider: input.provider,
			type: 'oauth',
			providerAccountId: 'test',
		},
	} as unknown as SignInArgs
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('authConfig.callbacks.signIn — provider-scoped corporate domain gate', () => {
	it('lets a PARTNER with a non-corporate email through for the credentials provider (authorize() already fully vetted them)', async () => {
		const signIn = getSignIn()
		const result = await signIn!(
			signInArgs({ email: 'partner@gmail.com', provider: 'credentials', role: 'PARTNER' })
		)

		expect(result).toBe(true)
		expect(mocks.validateUserByEmail).not.toHaveBeenCalled()
		expect(mocks.logAuditEvent).not.toHaveBeenCalledWith(
			expect.objectContaining({ action: 'INVALID_DOMAIN' })
		)
	})

	it('still rejects a non-corporate email for the Google OAuth provider', async () => {
		const signIn = getSignIn()
		const result = await signIn!(
			signInArgs({ email: 'someone@gmail.com', provider: 'google' })
		)

		expect(result).toBe('/login?error=InvalidDomain')
		expect(mocks.logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'INVALID_DOMAIN' })
		)
	})
})
