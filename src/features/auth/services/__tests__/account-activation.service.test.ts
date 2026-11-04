import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeDb, type FakeUser } from './fake-account-token-db'

const fakeRef = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('@/lib/prisma', () => ({
	get prisma() {
		return fakeRef.current
	},
}))
vi.mock('../../lib/password-utils', () => ({
	hashPassword: vi.fn(),
}))

import { hashPassword } from '../../lib/password-utils'
import { issueToken, consumeToken } from '../account-token.service'
import {
	activateAccount,
	peekToken,
	requestPasswordReset,
	resetPassword,
} from '../account-activation.service'

const NOW = new Date('2026-03-01T12:00:00.000Z')
const asDb = () => fake.db as never

function user(overrides: Partial<FakeUser> = {}): FakeUser {
	return {
		idUser: 1,
		active: true,
		activatedAt: null,
		ssoOnly: true,
		password: null,
		email: 'Partner@Example.com',
		...overrides,
	}
}

let fake: ReturnType<typeof createFakeDb>

function setUsers(users: FakeUser[]) {
	fake = createFakeDb(users)
	fakeRef.current = fake.db
}

beforeEach(() => {
	vi.mocked(hashPassword).mockImplementation(async (p) => `hashed:${p}`)
	setUsers([user()])
})

describe('peekToken', () => {
	it('is true for an open token of an active user and consumes nothing', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		expect(await peekToken({ rawToken, type: 'ACTIVATION', now: NOW })).toBe(
			true
		)
		expect(fake.tokens[0].usedAt).toBeNull()
		expect(await peekToken({ rawToken, type: 'ACTIVATION', now: NOW })).toBe(
			true
		)
	})

	it.each([['unknown', () => 'nope']])(
		'is false for %s tokens',
		async (_label, raw) => {
			expect(
				await peekToken({ rawToken: raw(), type: 'ACTIVATION', now: NOW })
			).toBe(false)
		}
	)

	it('is false when used, revoked, expired, wrong type or user inactive', async () => {
		const used = await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		await consumeToken(asDb(), {
			rawToken: used.rawToken,
			type: 'RESET',
			now: NOW,
		})
		expect(
			await peekToken({ rawToken: used.rawToken, type: 'RESET', now: NOW })
		).toBe(false)

		const open = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		expect(
			await peekToken({ rawToken: open.rawToken, type: 'RESET', now: NOW })
		).toBe(false)
		expect(
			await peekToken({
				rawToken: open.rawToken,
				type: 'ACTIVATION',
				now: open.expiresAt,
			})
		).toBe(false)
		fake.users.get(1)!.active = false
		expect(
			await peekToken({ rawToken: open.rawToken, type: 'ACTIVATION', now: NOW })
		).toBe(false)
	})
})

describe('activateAccount', () => {
	async function pendingToken() {
		return issueToken(asDb(), { idUser: 1, type: 'ACTIVATION' }, NOW)
	}

	it('sets the bcrypt hash and activatedAt, enables password login and consumes the token', async () => {
		const { rawToken } = await pendingToken()
		const result = await activateAccount({
			rawToken,
			password: 'abcd1234',
			now: NOW,
		})

		expect(result).toEqual({
			ok: true,
			idUser: 1,
			email: 'Partner@Example.com',
		})
		const stored = fake.users.get(1)!
		expect(stored.password).toBe('hashed:abcd1234')
		expect(stored.activatedAt).toEqual(NOW)
		expect(stored.ssoOnly).toBe(false)
		expect(fake.tokens[0].usedAt).toEqual(NOW)
	})

	it('does not run bcrypt for a garbage token (token is checked before hashing)', async () => {
		const result = await activateAccount({
			rawToken: 'garbage',
			password: 'abcd1234',
			now: NOW,
		})
		expect(result).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
		expect(hashPassword).not.toHaveBeenCalled()
	})

	it('does not run bcrypt for an expired or reused token either', async () => {
		const { rawToken } = await pendingToken()
		const later = new Date(NOW.getTime() + 73 * 60 * 60 * 1000)
		expect(
			await activateAccount({ rawToken, password: 'abcd1234', now: later })
		).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
		expect(hashPassword).not.toHaveBeenCalled()

		await activateAccount({ rawToken, password: 'abcd1234', now: NOW })
		vi.mocked(hashPassword).mockClear()
		expect(
			await activateAccount({ rawToken, password: 'abcd1234', now: NOW })
		).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
		expect(hashPassword).not.toHaveBeenCalled()
	})

	it('still returns INVALID_TOKEN when the token is consumed between the pre-check and the transaction', async () => {
		const { rawToken } = await pendingToken()
		vi.mocked(hashPassword).mockImplementationOnce(async (password) => {
			// A concurrent request wins the race while this one is hashing.
			await consumeToken(asDb(), { rawToken, type: 'ACTIVATION', now: NOW })
			return `hashed:${password}`
		})
		const result = await activateAccount({
			rawToken,
			password: 'abcd1234',
			now: NOW,
		})
		expect(result).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
		expect(fake.users.get(1)!.password).toBeNull()
	})

	it('revokes remaining open tokens of the user', async () => {
		const first = await pendingToken()
		const reset = await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		await activateAccount({
			rawToken: first.rawToken,
			password: 'abcd1234',
			now: NOW,
		})
		expect(fake.tokens.find((t) => t.id === 2)!.revokedAt).toEqual(NOW)
		expect(
			await consumeToken(asDb(), {
				rawToken: reset.rawToken,
				type: 'RESET',
				now: NOW,
			})
		).toBeNull()
	})

	it('reuse fails with a generic INVALID_TOKEN', async () => {
		const { rawToken } = await pendingToken()
		await activateAccount({ rawToken, password: 'abcd1234', now: NOW })
		expect(
			await activateAccount({ rawToken, password: 'zzzz9999', now: NOW })
		).toEqual({
			ok: false,
			reason: 'INVALID_TOKEN',
		})
		expect(fake.users.get(1)!.password).toBe('hashed:abcd1234')
	})

	it.each([['unknown token', 'unknown']])(
		'rejects %s',
		async (_l, rawToken) => {
			expect(
				await activateAccount({ rawToken, password: 'abcd1234', now: NOW })
			).toEqual({
				ok: false,
				reason: 'INVALID_TOKEN',
			})
			// The hash is computed before the token lookup on purpose (uniform timing).
			expect(fake.users.get(1)!.password).toBeNull()
		}
	)

	it('rejects an expired token and a deactivated user', async () => {
		const { rawToken, expiresAt } = await pendingToken()
		expect(
			await activateAccount({ rawToken, password: 'abcd1234', now: expiresAt })
		).toEqual({
			ok: false,
			reason: 'INVALID_TOKEN',
		})
		fake.users.get(1)!.active = false
		expect(
			await activateAccount({ rawToken, password: 'abcd1234', now: NOW })
		).toEqual({
			ok: false,
			reason: 'INVALID_TOKEN',
		})
		expect(fake.users.get(1)!.activatedAt).toBeNull()
	})

	it('rejects an already activated user and rolls the token back', async () => {
		const { rawToken } = await pendingToken()
		fake.users.get(1)!.activatedAt = new Date('2026-01-01T00:00:00.000Z')
		fake.users.get(1)!.password = 'existing'
		expect(
			await activateAccount({ rawToken, password: 'abcd1234', now: NOW })
		).toEqual({
			ok: false,
			reason: 'INVALID_TOKEN',
		})
		expect(fake.users.get(1)!.password).toBe('existing')
		expect(fake.tokens[0].usedAt).toBeNull()
	})

	it('a failed password write does not burn the token', async () => {
		const { rawToken } = await pendingToken()
		const original = fake.db.user.updateMany
		fake.db.user.updateMany = async () => {
			throw new Error('db down')
		}
		await expect(
			activateAccount({ rawToken, password: 'abcd1234', now: NOW })
		).rejects.toThrow('db down')
		fake.db.user.updateMany = original
		expect(fake.tokens[0].usedAt).toBeNull()
		expect(
			await activateAccount({ rawToken, password: 'abcd1234', now: NOW })
		).toMatchObject({
			ok: true,
		})
	})

	it('concurrent activation succeeds exactly once', async () => {
		const { rawToken } = await pendingToken()
		const results = await Promise.all(
			Array.from({ length: 8 }, () =>
				activateAccount({ rawToken, password: 'abcd1234', now: NOW })
			)
		)
		expect(results.filter((r) => r.ok)).toHaveLength(1)
	})

	it('never leaks the raw token or the plain password into the result', async () => {
		const { rawToken } = await pendingToken()
		const result = await activateAccount({
			rawToken,
			password: 'abcd1234',
			now: NOW,
		})
		expect(JSON.stringify(result)).not.toContain(rawToken)
		expect(JSON.stringify(result)).not.toContain('abcd1234')
	})
})

describe('requestPasswordReset', () => {
	const eligible = () =>
		user({
			activatedAt: new Date('2026-01-01'),
			ssoOnly: false,
			password: 'hash',
		})

	it('issues a RESET token for an eligible user (email match is case-insensitive)', async () => {
		setUsers([eligible()])
		const result = await requestPasswordReset({
			email: '  partner@example.COM ',
			now: NOW,
		})
		expect(result.status).toBe('issued')
		if (result.status !== 'issued') throw new Error('unreachable')
		expect(result.idUser).toBe(1)
		expect(result.email).toBe('Partner@Example.com')
		expect(result.expiresAt.getTime()).toBe(NOW.getTime() + 60 * 60 * 1000)
		expect(fake.tokens).toHaveLength(1)
		expect(fake.tokens[0].type).toBe('RESET')
		expect(JSON.stringify(fake.tokens)).not.toContain(result.rawToken)
	})

	it('a second request revokes the first reset link', async () => {
		setUsers([eligible()])
		const first = await requestPasswordReset({
			email: 'partner@example.com',
			now: NOW,
		})
		const second = await requestPasswordReset({
			email: 'partner@example.com',
			now: NOW,
		})
		if (first.status !== 'issued' || second.status !== 'issued')
			throw new Error('unreachable')
		expect(
			await consumeToken(asDb(), {
				rawToken: first.rawToken,
				type: 'RESET',
				now: NOW,
			})
		).toBeNull()
		expect(
			await consumeToken(asDb(), {
				rawToken: second.rawToken,
				type: 'RESET',
				now: NOW,
			})
		).toEqual({ idUser: 1 })
	})

	it.each([
		['unknown email', [], 'nobody@example.com'],
		['empty email', [], '   '],
		['inactive user', [{ active: false }], 'partner@example.com'],
		['pending (not activated)', [{ activatedAt: null }], 'partner@example.com'],
		['ssoOnly user', [{ ssoOnly: true }], 'partner@example.com'],
		['user without password', [{ password: null }], 'partner@example.com'],
	] as [string, Partial<FakeUser>[], string][])(
		'ignores %s without creating a token',
		async (_label, overrides, email) => {
			setUsers(overrides.length ? [{ ...eligible(), ...overrides[0] }] : [])
			const result = await requestPasswordReset({ email, now: NOW })
			expect(result).toEqual({ status: 'ignored' })
			expect(fake.tokens).toHaveLength(0)
		}
	)

	it('never throws or distinguishes unknown from ineligible users', async () => {
		setUsers([{ ...eligible(), ssoOnly: true }])
		const unknown = await requestPasswordReset({ email: 'x@y.co', now: NOW })
		const sso = await requestPasswordReset({
			email: 'partner@example.com',
			now: NOW,
		})
		expect(unknown).toEqual(sso)
	})

	it('never creates or modifies a password', async () => {
		setUsers([{ ...eligible(), ssoOnly: true }])
		await requestPasswordReset({ email: 'partner@example.com', now: NOW })
		expect(hashPassword).not.toHaveBeenCalled()
		expect(fake.users.get(1)!.password).toBe('hash')
	})
})

describe('resetPassword', () => {
	const eligible = () =>
		user({
			activatedAt: new Date('2026-01-01'),
			ssoOnly: false,
			password: 'old-hash',
		})

	async function resetToken() {
		const issued = await requestPasswordReset({
			email: 'partner@example.com',
			now: NOW,
		})
		if (issued.status !== 'issued') throw new Error('not issued')
		return issued.rawToken
	}

	beforeEach(() => setUsers([eligible()]))

	it('does not run bcrypt for a garbage, expired or reused token', async () => {
		expect(
			await resetPassword({
				rawToken: 'garbage',
				password: 'newpass1',
				now: NOW,
			})
		).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
		expect(hashPassword).not.toHaveBeenCalled()

		const rawToken = await resetToken()
		const later = new Date(NOW.getTime() + 2 * 60 * 60 * 1000)
		expect(
			await resetPassword({ rawToken, password: 'newpass1', now: later })
		).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
		expect(hashPassword).not.toHaveBeenCalled()
	})

	it('still returns INVALID_TOKEN when the token is consumed between the pre-check and the transaction', async () => {
		const rawToken = await resetToken()
		vi.mocked(hashPassword).mockImplementationOnce(async (password) => {
			await consumeToken(asDb(), { rawToken, type: 'RESET', now: NOW })
			return `hashed:${password}`
		})
		const result = await resetPassword({
			rawToken,
			password: 'newpass1',
			now: NOW,
		})
		expect(result).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
		expect(fake.users.get(1)!.password).toBe('old-hash')
	})

	it('consumes the token, sets the new hash and keeps activatedAt', async () => {
		const rawToken = await resetToken()
		const result = await resetPassword({
			rawToken,
			password: 'newpass1',
			now: NOW,
		})
		expect(result).toEqual({
			ok: true,
			idUser: 1,
			email: 'Partner@Example.com',
		})
		expect(fake.users.get(1)!.password).toBe('hashed:newpass1')
		expect(fake.users.get(1)!.activatedAt).toEqual(new Date('2026-01-01'))
		expect(fake.tokens[0].usedAt).toEqual(NOW)
	})

	it('revokes the other open RESET tokens', async () => {
		const rawToken = await resetToken()
		// A second open reset token created out of band (e.g. another instance).
		await fake.db.accountToken.create({
			data: {
				idUser: 1,
				type: 'RESET',
				tokenHash: 'f'.repeat(64),
				expiresAt: new Date(NOW.getTime() + 1000),
			},
		})
		await resetPassword({ rawToken, password: 'newpass1', now: NOW })
		expect(
			fake.tokens.find((t) => t.tokenHash === 'f'.repeat(64))!.revokedAt
		).toEqual(NOW)
	})

	it('rejects reuse, unknown, expired and wrong type tokens generically', async () => {
		const rawToken = await resetToken()
		await resetPassword({ rawToken, password: 'newpass1', now: NOW })
		const invalid = { ok: false, reason: 'INVALID_TOKEN' }
		expect(
			await resetPassword({ rawToken, password: 'other123', now: NOW })
		).toEqual(invalid)
		expect(
			await resetPassword({ rawToken: 'nope', password: 'other123', now: NOW })
		).toEqual(invalid)

		const activation = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		expect(
			await resetPassword({
				rawToken: activation.rawToken,
				password: 'other123',
				now: NOW,
			})
		).toEqual(invalid)

		const fresh = await resetToken()
		expect(
			await resetPassword({
				rawToken: fresh,
				password: 'other123',
				now: new Date(NOW.getTime() + 60 * 60 * 1000),
			})
		).toEqual(invalid)
		expect(fake.users.get(1)!.password).toBe('hashed:newpass1')
	})

	it.each([
		['deactivated', { active: false }],
		['sso only', { ssoOnly: true }],
		['not activated', { activatedAt: null }],
	] as [string, Partial<FakeUser>][])(
		'rejects when the user became %s and rolls the token back',
		async (_label, overrides) => {
			const rawToken = await resetToken()
			Object.assign(fake.users.get(1)!, overrides)
			expect(
				await resetPassword({ rawToken, password: 'newpass1', now: NOW })
			).toEqual({
				ok: false,
				reason: 'INVALID_TOKEN',
			})
			expect(fake.users.get(1)!.password).toBe('old-hash')
			expect(fake.tokens[0].usedAt).toBeNull()
		}
	)

	it('a failed password write does not burn the token', async () => {
		const rawToken = await resetToken()
		const original = fake.db.user.updateMany
		fake.db.user.updateMany = async () => {
			throw new Error('db down')
		}
		await expect(
			resetPassword({ rawToken, password: 'newpass1', now: NOW })
		).rejects.toThrow('db down')
		fake.db.user.updateMany = original
		expect(fake.tokens[0].usedAt).toBeNull()
		expect(
			await resetPassword({ rawToken, password: 'newpass1', now: NOW })
		).toMatchObject({
			ok: true,
		})
	})

	it('concurrent reset succeeds exactly once', async () => {
		const rawToken = await resetToken()
		const results = await Promise.all(
			Array.from({ length: 8 }, () =>
				resetPassword({ rawToken, password: 'newpass1', now: NOW })
			)
		)
		expect(results.filter((r) => r.ok)).toHaveLength(1)
	})
})
