export const PARTNER_STATUS = {
	PENDING: 'PENDING',
	ACTIVE: 'ACTIVE',
	DEACTIVATED: 'DEACTIVATED',
} as const

type Status = (typeof PARTNER_STATUS)[keyof typeof PARTNER_STATUS]

export const PARTNER_STATUS_LABELS: Record<Status, string> = {
	PENDING: 'Pendiente',
	ACTIVE: 'Activo',
	DEACTIVATED: 'Desactivado',
}

/**
 * Derives the partner lifecycle state from the two stored facts (PM-05):
 * PENDING = active and never activated; ACTIVE = active and activated;
 * DEACTIVATED = `active` is false (regardless of activation).
 */
export function derivePartnerStatus(input: {
	active: boolean
	activatedAt: Date | null
}): Status {
	if (!input.active) return PARTNER_STATUS.DEACTIVATED
	return input.activatedAt ? PARTNER_STATUS.ACTIVE : PARTNER_STATUS.PENDING
}
