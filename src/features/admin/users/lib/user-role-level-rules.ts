import { isReadOnlyRole, UserRole } from '@/features/auth/lib/roles'
import { PARTNER_EXTERNAL_LEVEL_CODE } from '@/features/shared/lib/level-codes'
import {
	PARTNER_LEVEL_ASSIGNMENT_ERROR,
	PARTNER_ROLE_ASSIGNMENT_ERROR,
} from './partner-guard'

export type ValidateRoleLevelPairResult =
	| { ok: true }
	| { ok: false; error: string }

/**
 * Structural rule rejecting the assignment of a hierarchy Level to a
 * read-only role (e.g. CONSULTOR). Must be evaluated against the EFFECTIVE
 * post-update (roleCode, levelId) pair — covering both assigning a level to
 * an existing read-only user and switching an already-leveled user to a
 * read-only role in the same request.
 *
 * Choice: reject, never silently clear `levelId` — see design D4.
 *
 * Partner pairing (PM-07): role PARTNER and level PARTNER_EXTERNAL travel
 * together and are created ONLY by the Partners module, so this users-module
 * rule rejects either one without the other (both directions). `levelCode` is
 * the effective level code (null/undefined when there is no level).
 */
export function validateRoleLevelPair(input: {
	roleCode: string | null | undefined
	levelId: number | null | undefined
	levelCode?: string | null
}): ValidateRoleLevelPairResult {
	const { roleCode, levelId, levelCode } = input

	const isPartnerRole = roleCode === UserRole.PARTNER
	const isPartnerLevel = levelCode === PARTNER_EXTERNAL_LEVEL_CODE
	if (isPartnerRole && !isPartnerLevel) {
		return { ok: false, error: PARTNER_ROLE_ASSIGNMENT_ERROR }
	}
	if (isPartnerLevel && !isPartnerRole) {
		return { ok: false, error: PARTNER_LEVEL_ASSIGNMENT_ERROR }
	}

	if (isReadOnlyRole(roleCode) && levelId !== null && levelId !== undefined) {
		return {
			ok: false,
			error:
				'Un usuario con rol de solo lectura no puede tener un nivel jerárquico asignado',
		}
	}

	return { ok: true }
}
