import type { AccountTokenType } from '@prisma/client'
import { checkAccountTokenIp } from '../lib/account-rate-limiters'
import { peekToken } from './account-activation.service'

type AccountLinkScope = 'activate' | 'reset-password'

const TOKEN_TYPE_BY_SCOPE: Record<AccountLinkScope, AccountTokenType> = {
	activate: 'ACTIVATION',
	'reset-password': 'RESET',
}

/**
 * Server-side link check for the activation / reset pages. Replaces the old
 * client preview round trip, so the raw token never travels in an API query
 * string. Shares the per-IP budget of the POST endpoints; a throttled lookup
 * answers `false` without querying the database. Consumes nothing.
 */
export async function resolveAccountLinkValidity(input: {
	scope: AccountLinkScope
	rawToken: string | null
	/** Trusted client IP (see `getTrustedClientIp`). */
	clientIp: string
}): Promise<boolean> {
	if (!input.rawToken) return false
	if (!checkAccountTokenIp(input.scope, input.clientIp).allowed) return false
	return peekToken({
		rawToken: input.rawToken,
		type: TOKEN_TYPE_BY_SCOPE[input.scope],
	})
}
