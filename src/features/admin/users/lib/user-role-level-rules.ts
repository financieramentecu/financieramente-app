import { isReadOnlyRole } from '@/features/auth/lib/roles'

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
 */
export function validateRoleLevelPair(input: {
	roleCode: string | null | undefined
	levelId: number | null | undefined
}): ValidateRoleLevelPairResult {
	const { roleCode, levelId } = input

	if (isReadOnlyRole(roleCode) && levelId !== null && levelId !== undefined) {
		return {
			ok: false,
			error:
				'Un usuario con rol de solo lectura no puede tener un nivel jerárquico asignado',
		}
	}

	return { ok: true }
}
