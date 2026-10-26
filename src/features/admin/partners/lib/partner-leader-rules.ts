import { UserRole } from '@/features/auth/lib/roles'
import { isPartnerLeaderLevel } from '@/features/shared/lib/level-codes'

export type LeaderCandidateResult = { ok: true } | { ok: false; error: string }

export interface LeaderCandidate {
	active: boolean
	levelCode: string | null | undefined
	roleCode: string | null | undefined
}

/**
 * Server-side leader rule for a new partner (PM-02, PM-03): the leader must
 * exist, be active, hold LEVEL_1..LEVEL_5 and must not be a PARTNER.
 */
export function validateLeaderCandidate(
	candidate: LeaderCandidate | null | undefined
): LeaderCandidateResult {
	if (!candidate) return { ok: false, error: 'El líder no existe' }
	if (!candidate.active) {
		return { ok: false, error: 'El líder debe estar activo' }
	}
	if (candidate.roleCode === UserRole.PARTNER) {
		return { ok: false, error: 'Un partner no puede ser líder' }
	}
	if (!isPartnerLeaderLevel(candidate.levelCode)) {
		return {
			ok: false,
			error: 'El líder debe tener un nivel entre Nivel 1 y Nivel 5',
		}
	}
	return { ok: true }
}
