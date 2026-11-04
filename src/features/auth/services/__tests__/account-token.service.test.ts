import { describe, it, expect, beforeEach } from 'vitest'
import { hashToken } from '../../lib/account-token'
import {
	consumeToken,
	issueToken,
	revokeOpenTokens,
} from '../account-token.service'
import { createFakeDb, type FakeUser } from './fake-account-token-db'

const NOW = new Date('2026-03-01T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

function user(overrides: Partial<FakeUser> = {}): FakeUser {
	return {
		idUser: 1,
		active: true,
		activatedAt: null,
		ssoOnly: true,
		password: null,
		email: 'a@b.co',
		...overrides,
	}
}

type Fake = ReturnType<typeof createFakeDb>
let fake: Fake
const asDb = () => fake.db as never

beforeEach(() => {
	fake = createFakeDb([user(), user({ idUser: 2, email: 'c@d.co' })])
})

describe('issueToken', () => {
	it('returns the raw token and persists only its SHA-256 hash', async () => {
		const { rawToken, expiresAt } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
		expect(fake.tokens).toHaveLength(1)
		expect(fake.tokens[0].tokenHash).toBe(hashToken(rawToken))
		expect(fake.tokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/)
		expect(JSON.stringify(fake.tokens)).not.toContain(rawToken)
		expect(expiresAt.getTime()).toBe(NOW.getTime() + 72 * HOUR)
	})

	it('uses a 1h TTL for RESET', async () => {
		const { expiresAt } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'RESET' },
			NOW
		)
		expect(expiresAt.getTime()).toBe(NOW.getTime() + HOUR)
	})

	it('resend revokes the previous open token of the same type only', async () => {
		const first = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		const reset = await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		const other = await issueToken(
			asDb(),
			{ idUser: 2, type: 'ACTIVATION' },
			NOW
		)
		const second = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)

		expect(
			await consumeToken(asDb(), {
				rawToken: first.rawToken,
				type: 'ACTIVATION',
				now: NOW,
			})
		).toBeNull()
		expect(
			await consumeToken(asDb(), {
				rawToken: second.rawToken,
				type: 'ACTIVATION',
				now: NOW,
			})
		).toEqual({ idUser: 1 })
		expect(
			await consumeToken(asDb(), {
				rawToken: reset.rawToken,
				type: 'RESET',
				now: NOW,
			})
		).toEqual({ idUser: 1 })
		expect(
			await consumeToken(asDb(), {
				rawToken: other.rawToken,
				type: 'ACTIVATION',
				now: NOW,
			})
		).toEqual({ idUser: 2 })
	})

	it('is atomic: wraps revoke + create in a transaction when given a root client', async () => {
		await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		expect(fake.transactionCalls()).toBe(1)
	})

	it('does not nest a transaction when already given one', async () => {
		await fake.db.$transaction(async (tx) => {
			await issueToken(tx as never, { idUser: 1, type: 'RESET' }, NOW)
		})
		expect(fake.transactionCalls()).toBe(1)
	})

	it('rolls back the revoke when the create fails', async () => {
		const first = await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		const failing = {
			...fake.db,
			accountToken: {
				...fake.db.accountToken,
				create: async () => {
					throw new Error('boom')
				},
			},
		}
		failing.$transaction = (fn) =>
			fake.db.$transaction(async (tx) =>
				fn({ ...(tx as object), accountToken: failing.accountToken })
			)
		await expect(
			issueToken(failing as never, { idUser: 1, type: 'RESET' }, NOW)
		).rejects.toThrow('boom')
		expect(
			await consumeToken(asDb(), {
				rawToken: first.rawToken,
				type: 'RESET',
				now: NOW,
			})
		).toEqual({ idUser: 1 })
	})
})

describe('consumeToken [TM]', () => {
	it('consumes an open token once and marks usedAt', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		const result = await consumeToken(asDb(), {
			rawToken,
			type: 'ACTIVATION',
			now: NOW,
		})
		expect(result).toEqual({ idUser: 1 })
		expect(fake.tokens[0].usedAt).toEqual(NOW)
	})

	it('rejects reuse', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'RESET' },
			NOW
		)
		await consumeToken(asDb(), { rawToken, type: 'RESET', now: NOW })
		expect(
			await consumeToken(asDb(), { rawToken, type: 'RESET', now: NOW })
		).toBeNull()
	})

	it('rejects an expired token (boundary: expiresAt itself is expired)', async () => {
		const { rawToken, expiresAt } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'RESET' },
			NOW
		)
		expect(
			await consumeToken(asDb(), { rawToken, type: 'RESET', now: expiresAt })
		).toBeNull()
		expect(
			await consumeToken(asDb(), {
				rawToken,
				type: 'RESET',
				now: new Date(expiresAt.getTime() + 1),
			})
		).toBeNull()
		expect(
			await consumeToken(asDb(), {
				rawToken,
				type: 'RESET',
				now: new Date(expiresAt.getTime() - 1),
			})
		).toEqual({ idUser: 1 })
	})

	it('rejects a revoked token', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		await revokeOpenTokens(asDb(), { idUser: 1 }, NOW)
		expect(
			await consumeToken(asDb(), { rawToken, type: 'ACTIVATION', now: NOW })
		).toBeNull()
	})

	it('rejects a token of a deactivated user', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		fake.users.get(1)!.active = false
		expect(
			await consumeToken(asDb(), { rawToken, type: 'ACTIVATION', now: NOW })
		).toBeNull()
		expect(fake.tokens[0].usedAt).toBeNull()
	})

	it('rejects a token presented with the wrong type', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		expect(
			await consumeToken(asDb(), { rawToken, type: 'RESET', now: NOW })
		).toBeNull()
		expect(fake.tokens[0].usedAt).toBeNull()
	})

	it.each(['', 'unknown-token', 'x'.repeat(500)])(
		'rejects an unknown or malformed token %j',
		async (rawToken) => {
			await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
			expect(
				await consumeToken(asDb(), { rawToken, type: 'RESET', now: NOW })
			).toBeNull()
		}
	)

	it('concurrent consume yields exactly one success', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'ACTIVATION' },
			NOW
		)
		const results = await Promise.all(
			Array.from({ length: 10 }, () =>
				consumeToken(asDb(), { rawToken, type: 'ACTIVATION', now: NOW })
			)
		)
		expect(results.filter((r) => r !== null)).toHaveLength(1)
		expect(results.filter((r) => r === null)).toHaveLength(9)
	})

	it('uses a single guarded updateMany on the hash (never the raw token)', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'RESET' },
			NOW
		)
		const calls: unknown[] = []
		const spyDb = {
			...fake.db,
			accountToken: {
				...fake.db.accountToken,
				updateMany: (args: unknown) => {
					calls.push(args)
					return fake.db.accountToken.updateMany(args as never)
				},
			},
		}
		await consumeToken(spyDb as never, { rawToken, type: 'RESET', now: NOW })
		expect(calls).toEqual([
			{
				where: {
					tokenHash: hashToken(rawToken),
					type: 'RESET',
					usedAt: null,
					revokedAt: null,
					expiresAt: { gt: NOW },
					user: { active: true },
				},
				data: { usedAt: NOW },
			},
		])
		expect(JSON.stringify(calls)).not.toContain(rawToken)
	})
})

describe('revokeOpenTokens', () => {
	it('revokes all open tokens of the user and returns the count', async () => {
		await issueToken(asDb(), { idUser: 1, type: 'ACTIVATION' }, NOW)
		await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		await issueToken(asDb(), { idUser: 2, type: 'RESET' }, NOW)
		expect(await revokeOpenTokens(asDb(), { idUser: 1 }, NOW)).toBe(2)
		expect(
			fake.tokens.filter((t) => t.idUser === 1).every((t) => t.revokedAt)
		).toBe(true)
		expect(fake.tokens.find((t) => t.idUser === 2)!.revokedAt).toBeNull()
	})

	it('can be limited to one type', async () => {
		await issueToken(asDb(), { idUser: 1, type: 'ACTIVATION' }, NOW)
		await issueToken(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		expect(
			await revokeOpenTokens(asDb(), { idUser: 1, type: 'RESET' }, NOW)
		).toBe(1)
		expect(
			fake.tokens.find((t) => t.type === 'ACTIVATION')!.revokedAt
		).toBeNull()
	})

	it('never deletes rows and skips already used or revoked tokens', async () => {
		const { rawToken } = await issueToken(
			asDb(),
			{ idUser: 1, type: 'RESET' },
			NOW
		)
		await consumeToken(asDb(), { rawToken, type: 'RESET', now: NOW })
		expect(await revokeOpenTokens(asDb(), { idUser: 1 }, NOW)).toBe(0)
		expect(fake.tokens).toHaveLength(1)
	})
})
