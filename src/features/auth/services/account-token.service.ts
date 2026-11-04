import type { AccountTokenType, Prisma, PrismaClient } from '@prisma/client'
import {
	computeTokenExpiry,
	generateRawToken,
	hashToken,
} from '../lib/account-token'

/** Root client or interactive-transaction client. */
export type AccountTokenDb = PrismaClient | Prisma.TransactionClient

export interface IssuedToken {
	/** Goes ONLY into the email link. Never persist or log it. */
	rawToken: string
	expiresAt: Date
}

function isRootClient(db: AccountTokenDb): db is PrismaClient {
	return '$transaction' in db
}

/**
 * Issues a new token and revokes the user's prior open tokens of the same type
 * (a resend invalidates the previous link). Revoke + create are atomic: with a
 * root client a transaction is opened here; with a transaction client the
 * caller's transaction is reused.
 */
export async function issueToken(
	db: AccountTokenDb,
	input: { idUser: number; type: AccountTokenType },
	now: Date = new Date()
): Promise<IssuedToken> {
	if (isRootClient(db)) {
		return db.$transaction((tx) => issueToken(tx, input, now))
	}

	await revokeOpenTokens(db, input, now)

	const rawToken = generateRawToken()
	const expiresAt = computeTokenExpiry(input.type, now)
	await db.accountToken.create({
		data: {
			idUser: input.idUser,
			type: input.type,
			tokenHash: hashToken(rawToken),
			expiresAt,
		},
	})

	return { rawToken, expiresAt }
}

/**
 * Atomic single-use consumption: one guarded UPDATE; exactly one concurrent
 * caller observes `count === 1`. Valid only for an active user. Call it INSIDE
 * the transaction that changes the password so a failed write rolls the
 * consumption back instead of burning the token.
 *
 * Returns null for unknown, used, revoked, expired, wrong-type or
 * deactivated-user tokens (one indistinguishable outcome).
 */
export async function consumeToken(
	db: AccountTokenDb,
	input: { rawToken: string; type: AccountTokenType; now: Date }
): Promise<{ idUser: number } | null> {
	const tokenHash = hashToken(input.rawToken)

	const token = await db.accountToken.findUnique({
		where: { tokenHash },
		select: { idUser: true },
	})
	if (!token) return null

	const { count } = await db.accountToken.updateMany({
		where: {
			tokenHash,
			type: input.type,
			usedAt: null,
			revokedAt: null,
			expiresAt: { gt: input.now },
			user: { active: true },
		},
		data: { usedAt: input.now },
	})

	return count === 1 ? { idUser: token.idUser } : null
}

/**
 * Revokes (never deletes) the user's open tokens, optionally of one type.
 * Used on deactivation and after a successful activation or reset.
 */
export async function revokeOpenTokens(
	db: AccountTokenDb,
	input: { idUser: number; type?: AccountTokenType },
	now: Date = new Date()
): Promise<number> {
	const { count } = await db.accountToken.updateMany({
		where: {
			idUser: input.idUser,
			...(input.type ? { type: input.type } : {}),
			usedAt: null,
			revokedAt: null,
		},
		data: { revokedAt: now },
	})
	return count
}
