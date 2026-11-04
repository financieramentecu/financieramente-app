import { AuditAction } from '@/features/auth/lib/audit-logger'
import { createTokenRouteHandlers } from '@/features/auth/lib/account-token-handlers'
import { resetPassword } from '@/features/auth/services/account-activation.service'

export const dynamic = 'force-dynamic'

/**
 * Public endpoints (allowed by the Edge allowlist).
 * POST { token, password } -> 200 | 400 | 429
 * The page validates the link on the server; there is no GET preview.
 */
export const { POST } = createTokenRouteHandlers({
	scope: 'reset-password',
	consume: resetPassword,
	auditAction: AuditAction.PASSWORD_RESET_COMPLETED,
	auditDetails: 'Contraseña restablecida mediante enlace de recuperación',
})
