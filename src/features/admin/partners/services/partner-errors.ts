export type PartnerErrorCode =
	| 'EMAIL_TAKEN'
	| 'IDENTITY_TAKEN'
	| 'INVALID_LEADER'
	| 'REFERENCE_DATA_MISSING'
	| 'NOT_FOUND'
	| 'INVALID_STATE'

/** Domain error of the partners module. The message is user-facing Spanish. */
export class PartnerServiceError extends Error {
	readonly code: PartnerErrorCode
	readonly field?: string

	constructor(code: PartnerErrorCode, message: string, field?: string) {
		super(message)
		this.name = 'PartnerServiceError'
		this.code = code
		this.field = field
	}
}
