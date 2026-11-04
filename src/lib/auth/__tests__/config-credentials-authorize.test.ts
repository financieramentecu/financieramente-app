import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
	validateUserCredentials: vi.fn(),
	logAuditEvent: vi.fn(),
}))

vi.mock('@/features/auth/lib/user-validation', () => ({
	validateUserById: vi.fn(),
	validateUserByEmail: vi.fn(),
	validateUserCredentials: mocks.validateUserCredentials,
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: mocks.logAuditEvent,
	AuditAction: { ACCESS_DENIED: 'ACCESS_DENIED', LOGIN: 'LOGIN' },
}))
vi.mock('@/features/auth/lib/user-creation', () => ({
	createUserAutomatically: vi.fn(),
}))
vi.mock('@/features/auth/services/session-user.service', () => ({
	getSessionUserState: vi.fn(),
}))

import { authConfig } from '../config'
import {
	CREDENTIALS_EMAIL_LIMIT,
	CREDENTIALS_IP_LIMIT,
	resetCredentialsRateLimiters,
} from '@/features/auth/lib/credentials-rate-limiter'
import {
	RATE_LIMITED_CODE,
	RATE_LIMITED_MESSAGE,
} from '@/features/auth/lib/credentials-error-codes'

type Authorize = (
	credentials: Record<string, unknown>,
	request: Request
) => Promise<unknown>

function getAuthorize(): Authorize {
	const provider = authConfig.providers.find(
		(candidate) =>
			typeof candidate === 'object' &&
			(candidate as { id?: string }).id === 'credentials'
	) as { authorize?: Authorize; options?: { authorize?: Authorize } }
	return (provider.options?.authorize ?? provider.authorize) as Authorize
}

function requestFrom(ip: string): Request {
	return new Request('http://localhost/api/auth/callback/credentials', {
		method: 'POST',
		headers: { 'x-real-ip': ip, 'x-forwarded-for': `6.6.6.6, ${ip}` },
	})
}

const GOOD_USER = {
	isValid: true,
	user: { id: 5, email: 'ana@example.com', name: 'Ana', role: 'ADMIN' },
}

async function attempt(email: string, ip: string, password = 'wrong-pass1') {
	try {
		return await getAuthorize()({ email, password }, requestFrom(ip))
	} catch (error) {
		return error
	}
}

function isThrottled(result: unknown): boolean {
	return (
		result instanceof Error &&
		(result as { code?: string }).code === RATE_LIMITED_CODE
	)
}

beforeEach(() => {
	vi.clearAllMocks()
	resetCredentialsRateLimiters()
	mocks.validateUserCredentials.mockResolvedValue({
		isValid: false,
		user: null,
		error: 'USER_NOT_FOUND',
	})
})

describe('credentials authorize rate limiting [TM] (F26)', () => {
	it('still returns null for bad credentials under the limit', async () => {
		expect(await attempt('ghost@example.com', '203.0.113.1')).toBeNull()
	})

	it('still authorizes valid credentials under the limit', async () => {
		mocks.validateUserCredentials.mockResolvedValue(GOOD_USER)
		const result = await attempt('ana@example.com', '203.0.113.1', 'Abcdef12')
		expect(result).toMatchObject({ id: '5', email: 'ana@example.com' })
	})

	it.each([
		['an existing email', 'exists@example.com', GOOD_USER],
		[
			'a non-existing email',
			'ghost@example.com',
			{ isValid: false, user: null, error: 'USER_NOT_FOUND' },
		],
	])(
		'throttles attempt N+1 for %s with the same rate-limited error and no DB lookup',
		async (_label, email, validation) => {
			mocks.validateUserCredentials.mockResolvedValue(validation)
			for (let i = 0; i < CREDENTIALS_EMAIL_LIMIT; i++) {
				await attempt(email, `10.0.0.${i}`)
			}
			mocks.validateUserCredentials.mockClear()
			const result = await attempt(email, '10.9.9.9')
			expect(isThrottled(result)).toBe(true)
			expect(mocks.validateUserCredentials).not.toHaveBeenCalled()
		}
	)

	it('different emails from one trusted IP hit the IP limit', async () => {
		for (let i = 0; i < CREDENTIALS_IP_LIMIT; i++) {
			await attempt(`user${i}@example.com`, '203.0.113.9')
		}
		expect(isThrottled(await attempt('next@example.com', '203.0.113.9'))).toBe(
			true
		)
	})

	it('keys on the trusted IP: spoofed leading x-forwarded-for hops do not evade the limit', async () => {
		function spoofed(index: number): Request {
			return new Request('http://localhost/api/auth/callback/credentials', {
				method: 'POST',
				headers: { 'x-forwarded-for': `198.51.100.${index}, 203.0.113.77` },
			})
		}
		for (let i = 0; i < CREDENTIALS_IP_LIMIT; i++) {
			await getAuthorize()(
				{ email: `s${i}@example.com`, password: 'wrong-pass1' },
				spoofed(i)
			)
		}
		await expect(
			getAuthorize()(
				{ email: 'next@example.com', password: 'wrong-pass1' },
				spoofed(99)
			)
		).rejects.toMatchObject({ code: RATE_LIMITED_CODE })
	})

	it('throttled attempts are not echoed with the email or account state', async () => {
		for (let i = 0; i < CREDENTIALS_EMAIL_LIMIT; i++) {
			await attempt('victim@example.com', `10.5.0.${i}`)
		}
		const result = (await attempt('victim@example.com', '10.5.9.9')) as Error
		expect(isThrottled(result)).toBe(true)
		expect(result.message).not.toContain('victim@example.com')
	})

	it('exposes a generic Spanish message for the throttled case', () => {
		expect(RATE_LIMITED_MESSAGE).toBe(
			'Demasiados intentos. Intenta de nuevo más tarde.'
		)
	})
})
