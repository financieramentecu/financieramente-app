import { randomUUID } from 'crypto'

export interface BuildComprobanteKeyOptions {
  prefix: string
  contract: string
  ext: string
  /** Injectable for testing; defaults to new Date() */
  now?: Date
  /** Injectable for testing; defaults to randomUUID() */
  uuid?: string
}

/**
 * Generates the S3/Spaces object key for a comprobante.
 * Format: {prefix}/negocios/{contract}/comprobantes/{contract}-{timestamp}-{uuid}.{ext}
 */
export function buildComprobanteKey({
  prefix,
  contract,
  ext,
  now = new Date(),
  uuid = randomUUID(),
}: BuildComprobanteKeyOptions): string {
  const ts = now.getTime()
  return `${prefix}/negocios/${contract}/comprobantes/${contract}-${ts}-${uuid}.${ext}`
}
