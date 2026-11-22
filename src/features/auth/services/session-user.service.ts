import { prisma } from '@/lib/prisma'
import { isRetryablePrismaConnectionError } from '@/lib/prisma-log'
import type { SessionUserState } from '../lib/session-revalidation'

/**
 * Minimal per-request user state for session revalidation (SEC-01).
 *
 * One primary-key read selecting only `active` and the role code. Deliberately
 * does not select `activatedAt`: the activation gate applies at login only.
 */
async function readSessionUserState(userId: number): Promise<SessionUserState | null> {
	const user = await prisma.user.findUnique({
		where: { idUser: userId },
		select: {
			active: true,
			canViewOthersCrm: true,
			role: { select: { code: true } },
		},
	})

	if (!user) return null

	return {
		active: user.active,
		roleCode: user.role?.code ?? null,
		canViewOthersCrm: user.canViewOthersCrm,
	}
}

export async function getSessionUserState(
	userId: number
): Promise<SessionUserState | null> {
	try {
		return await readSessionUserState(userId)
	} catch (error) {
		if (!isRetryablePrismaConnectionError(error)) throw error
		return readSessionUserState(userId)
	}
}
