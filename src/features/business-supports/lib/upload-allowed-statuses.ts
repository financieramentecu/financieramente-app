/**
 * Business statuses that allow uploading comprobantes.
 * Shared by UI gates and server-side presign validation.
 */
export const UPLOAD_ALLOWED_STATUSES = [
	'VENTA_EFECTUADA',
	'EMITIDO',
	'FONDEADO',
] as const

export type UploadAllowedStatus = (typeof UPLOAD_ALLOWED_STATUSES)[number]

export function isUploadAllowedStatus(
	status: string | null | undefined,
): status is UploadAllowedStatus {
	return (
		status != null &&
		(UPLOAD_ALLOWED_STATUSES as readonly string[]).includes(status)
	)
}

/** Spaces path segment: contract when present, otherwise negocio-{id}. */
export function comprobantePathId(
	contract: string | null | undefined,
	businessId: number,
): string {
	return contract ?? `negocio-${businessId}`
}
