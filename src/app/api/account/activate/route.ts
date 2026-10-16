import { AuditAction } from '@/features/auth/lib/audit-logger'
import { createTokenRouteHandlers } from '@/features/auth/lib/account-token-handlers'
import { activateAccount } from '@/features/auth/services/account-activation.service'

export const dynamic = 'force-dynamic'

/**
 * Public endpoints (allowed by the Edge allowlist).
 * POST { token, password } -> 200 | 400 | 429
 * The page validates the link on the server; there is no GET preview.
 */
export const { POST } = createTokenRouteHandlers({
	scope: 'activate',
	consume: activateAccount,
	auditAction: AuditAction.ACCOUNT_ACTIVATED,
	auditDetails: 'Cuenta activada mediante enlace de activación',
})
