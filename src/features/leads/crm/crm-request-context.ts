/** Who performs a CRM mutation and from where — used for audit records. */
export interface CrmRequestContext {
	userId: number
	email: string
	ipAddress?: string
	userAgent?: string
}
