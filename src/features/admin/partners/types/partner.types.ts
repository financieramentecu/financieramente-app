import type { PARTNER_STATUS } from '../lib/partner-status'

export type PartnerStatus = (typeof PARTNER_STATUS)[keyof typeof PARTNER_STATUS]

export interface PartnerLeaderSummary {
	readonly id: number
	name: string
	lastName: string | null
	email: string
	/** Level code of the leader (LEVEL_1..LEVEL_5); lets the edit form preselect it. */
	levelCode: string | null
}

export interface PartnerDto {
	readonly id: number
	name: string
	lastName: string | null
	typeIdentity: string
	identityNumber: string | null
	email: string
	phone: string | null
	active: boolean
	/** ISO instant; null until the partner sets a password from the link. */
	activatedAt: string | null
	/** ISO instant. Display it with `formatDateBogota`. */
	createdAt: string
	status: PartnerStatus
	leader: PartnerLeaderSummary | null
}

/** Result of create / resend: the DTO plus whether the e-mail went out. */
export type PartnerWithEmailResult = PartnerDto & { emailSent: boolean }

export interface PartnerLeaderOption {
	readonly id: number
	name: string
	lastName: string | null
	email: string
}

export interface LeaderLevelOption {
	code: string
	name: string
}

/** Validated payload of the create-partner request. */
export interface CreatePartnerInput {
	name: string
	lastName?: string
	typeIdentity: string
	identityNumber: string
	email: string
	phone?: string
	leaderId: number
}

/** Validated payload of the edit-partner request (no e-mail: not editable). */
export type UpdatePartnerInput = Omit<CreatePartnerInput, 'email'>

/** Result of an edit: the fresh DTO plus the names of the fields that changed. */
export interface UpdatePartnerResult {
	partner: PartnerDto
	changedFields: string[]
}
