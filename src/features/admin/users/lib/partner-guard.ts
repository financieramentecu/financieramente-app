import { UserRole } from '@/features/auth/lib/roles'
import { PARTNER_EXTERNAL_LEVEL_CODE } from '@/features/shared/lib/level-codes'

export const PARTNER_MANAGED_ERROR =
	'Los partners se gestionan únicamente desde el módulo Partners'

export const PARTNER_LEADER_ERROR = 'Un partner no puede ser líder'

export const PARTNER_ROLE_ASSIGNMENT_ERROR =
	'El rol Partner solo se asigna desde el módulo Partners'

export const PARTNER_LEVEL_ASSIGNMENT_ERROR =
	'El nivel Partner Externo solo se asigna desde el módulo Partners'

interface AccountLike {
	role?: { code: string } | null
	level?: { code: string } | null
}

/**
 * A partner is any account holding role PARTNER or level PARTNER_EXTERNAL.
 * The users module must treat it as read-only (PM-07, ADM-01).
 */
export function isPartnerAccount(account: AccountLike): boolean {
	return (
		account.role?.code === UserRole.PARTNER ||
		account.level?.code === PARTNER_EXTERNAL_LEVEL_CODE
	)
}
