import { prisma } from '@/lib/prisma'
import type { AccountTokenType } from '@prisma/client'
import { hashPassword } from '../lib/password-utils'
import { hashToken } from '../lib/account-token'
import {
	consumeToken,
	issueToken,
	revokeOpenTokens,
} from './account-token.service'

export type AccountActionResult =
	| { ok: true; idUser: number; email: string | null }
	| { ok: false; reason: 'INVALID_TOKEN' }

export type PasswordResetRequestResult =
	| {
			status: 'issued'
			idUser: number
			email: string
			name: string
			/** Goes ONLY into the email link. Never persist or log it. */
			rawToken: string
			expiresAt: Date
	  }
	| { status: 'ignored' }

const INVALID_TOKEN: AccountActionResult = {
	ok: false,
	reason: 'INVALID_TOKEN',
}

/** Thrown inside a transaction to roll it back (token consumption included). */
class InvalidTokenError extends Error {}

/**
 * Read-only check used by the public page: is the link currently open for an
 * active user? Consumes nothing.
 */
export async function peekToken(input: {
	rawToken: string
	type: AccountTokenType
	now?: Date
}): Promise<boolean> {
	const token = await prisma.accountToken.findFirst({
		where: {
			tokenHash: hashToken(input.rawToken),
			type: input.type,
			usedAt: null,
			revokedAt: null,
			expiresAt: { gt: input.now ?? new Date() },
			user: { active: true },
		},
		select: { id: true },
	})
	return token !== null
}

/**
 * Cheap pre-check so garbage or stale tokens never cost a bcrypt hash. It is an
 * optimization only: the guarantee is the atomic consume inside the
 * transaction, which still decides the outcome if the token is consumed
 * between this check and the write.
 */
function isTokenOpen(
	rawToken: string,
	type: AccountTokenType,
	now: Date
): Promise<boolean> {
	return peekToken({ rawToken, type, now })
}

/**
 * Consumes the token and applies `applyToUser` in ONE transaction. A token that
 * does not match, or a user that no longer qualifies (`applyToUser` returns
 * false), rolls everything back and yields the generic INVALID_TOKEN result.
 * Any other error propagates and also rolls back, so the token is not burned.
 */
async function consumeAndUpdateUser(input: {
	rawToken: string
	type: AccountTokenType
	now: Date
	applyToUser: (
		tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
		idUser: number
	) => Promise<boolean>
}): Promise<AccountActionResult> {
	try {
		return await prisma.$transaction(async (tx) => {
			const consumed = await consumeToken(tx, {
				rawToken: input.rawToken,
				type: input.type,
				now: input.now,
			})
			if (!consumed) throw new InvalidTokenError()

			const applied = await input.applyToUser(tx, consumed.idUser)
			if (!applied) throw new InvalidTokenError()

			await revokeOpenTokens(
				tx,
				{
					idUser: consumed.idUser,
					// Activation closes every remaining link; reset only other resets.
					type: input.type === 'RESET' ? 'RESET' : undefined,
				},
				input.now
			)

			const user = await tx.user.findUnique({
				where: { idUser: consumed.idUser },
				select: { email: true },
			})
			return { ok: true, idUser: consumed.idUser, email: user?.email ?? null }
		})
	} catch (error) {
		if (error instanceof InvalidTokenError) return INVALID_TOKEN
		throw error
	}
}

/**
 * First-time activation (AA-04): allowed only while the user is active and
 * `activatedAt` is null. Sets the bcrypt hash and `activatedAt`, and clears
 * `ssoOnly` (it defaults to true) so the credentials login can accept the new
 * password. Revokes any remaining open token.
 */
export async function activateAccount(input: {
	rawToken: string
	password: string
	now?: Date
}): Promise<AccountActionResult> {
	const now = input.now ?? new Date()
	if (!(await isTokenOpen(input.rawToken, 'ACTIVATION', now))) {
		return INVALID_TOKEN
	}
	// Hash outside the transaction: bcrypt is slow and must not hold row locks.
	const passwordHash = await hashPassword(input.password)

	return consumeAndUpdateUser({
		rawToken: input.rawToken,
		type: 'ACTIVATION',
		now,
		applyToUser: async (tx, idUser) => {
			const { count } = await tx.user.updateMany({
				where: { idUser, active: true, activatedAt: null },
				data: { password: passwordHash, activatedAt: now, ssoOnly: false },
			})
			return count === 1
		},
	})
}

/**
 * Starts a password reset (AA-07). Only active, activated, non-SSO users with a
 * stored password get a token. Every other case returns `{ status: 'ignored' }`
 * (never throws) so the route can answer identically and avoid enumeration.
 */
export async function requestPasswordReset(input: {
	email: string
	now?: Date
}): Promise<PasswordResetRequestResult> {
	const email = input.email.trim()
	if (!email) return { status: 'ignored' }

	const user = await prisma.user.findFirst({
		where: { email: { equals: email, mode: 'insensitive' } },
		select: {
			idUser: true,
			email: true,
			name: true,
			active: true,
			activatedAt: true,
			ssoOnly: true,
			password: true,
		},
	})

	const eligible =
		user !== null &&
		user.email !== null &&
		user.active &&
		user.activatedAt !== null &&
		!user.ssoOnly &&
		user.password !== null
	if (!eligible) return { status: 'ignored' }

	const { rawToken, expiresAt } = await issueToken(
		prisma,
		{ idUser: user.idUser, type: 'RESET' },
		input.now ?? new Date()
	)

	return {
		status: 'issued',
		idUser: user.idUser,
		email: user.email as string,
		name: user.name,
		rawToken,
		expiresAt,
	}
}

/**
 * Completes a reset (AA-07): consumes the RESET token inside the same
 * transaction as the password write, then revokes the user's other open reset
 * tokens. The user must still be active, activated and not SSO-only.
 */
export async function resetPassword(input: {
	rawToken: string
	password: string
	now?: Date
}): Promise<AccountActionResult> {
	const now = input.now ?? new Date()
	if (!(await isTokenOpen(input.rawToken, 'RESET', now))) return INVALID_TOKEN
	const passwordHash = await hashPassword(input.password)

	return consumeAndUpdateUser({
		rawToken: input.rawToken,
		type: 'RESET',
		now,
		applyToUser: async (tx, idUser) => {
			const { count } = await tx.user.updateMany({
				where: {
					idUser,
					active: true,
					activatedAt: { not: null },
					ssoOnly: false,
				},
				data: { password: passwordHash },
			})
			return count === 1
		},
	})
}
