import { randomUUID } from 'crypto'

export interface BuildComprobanteKeyOptions {
	prefix: string
	/** Contract number, or negocio-{id} when the business has no contract */
	pathId: string
	ext: string
	/** Injectable for testing; defaults to new Date() */
	now?: Date
	/** Injectable for testing; defaults to randomUUID() */
	uuid?: string
}

/**
 * Generates the S3/Spaces object key for a comprobante.
 * Format: {prefix}/negocios/{pathId}/comprobantes/{pathId}-{timestamp}-{uuid}.{ext}
 */
export function buildComprobanteKey({
	prefix,
	pathId,
	ext,
	now = new Date(),
	uuid = randomUUID(),
}: BuildComprobanteKeyOptions): string {
	const ts = now.getTime()
	return `${prefix}/negocios/${pathId}/comprobantes/${pathId}-${ts}-${uuid}.${ext}`
}
