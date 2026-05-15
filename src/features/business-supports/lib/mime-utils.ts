export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

/** 10 MB in bytes */
export const MAX_BYTES = 10 * 1024 * 1024

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function isAllowedMime(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

export function extensionFor(mime: string): string | null {
  if (!isAllowedMime(mime)) return null
  return MIME_TO_EXT[mime]
}

type ValidationOk = { ok: true }
type ValidationError = { ok: false; code: 'INVALID_MIME' | 'FILE_TOO_LARGE' }
type ValidationResult = ValidationOk | ValidationError

export function validateUpload(mime: string, sizeBytes: number): ValidationResult {
  if (!isAllowedMime(mime)) {
    return { ok: false, code: 'INVALID_MIME' }
  }
  if (sizeBytes > MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE' }
  }
  return { ok: true }
}
