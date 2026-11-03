/**
 * Maps the real funnel (`LeadFunnelColumn.externalStatusKey`) to the commercial
 * metrics. Keys are the stable CRM contract seeded in `lead-funnel-columns.ts`.
 */

export const STAGE_KEY = {
	NEW: 'NUEVO_LEAD',
	FIRST_CONTACT: 'PRIMER_CONTACTO',
	APPOINTMENT: 'DIAGNOSTICO_AGENDADO',
	ATTENDED: 'ASISTIO_AL_DIAGNOSTICO',
	NO_SHOW: 'NO_ASISTIO_AL_DIAGNOSTICO',
	TASKS_PENDING: 'PENDIENTE_TAREAS',
	PROPOSAL: 'ESTRUCTURANDO_PROPUESTA',
	WON: 'WON',
	CLOSED: 'CIERRE',
	ACCOMPANYING: 'EN_ACOMPANAMIENTO',
	POSTPONED: 'NEGOCIO_APLAZADO',
} as const

/**
 * Final, parked or in-follow-up stages: a lead there is not "stuck".
 * Same rule as the weekly Sheet report (En acompañamiento, Cierre, Negocio aplazado).
 */
export const NON_STUCK_STAGE_KEYS: readonly string[] = [
	STAGE_KEY.WON,
	STAGE_KEY.CLOSED,
	STAGE_KEY.POSTPONED,
	STAGE_KEY.ACCOMPANYING,
]

/** Days without movement before an open lead counts as stuck. */
export const STUCK_AFTER_DAYS = 7

export const STUCK_LIST_LIMIT = 50

export const ONE_HOUR_MS = 60 * 60 * 1000
export const ONE_DAY_MS = 24 * ONE_HOUR_MS
