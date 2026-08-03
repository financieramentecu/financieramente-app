export interface BusinessSupportDTO {
  id: string
  businessId: number
  objectKey: string
  mimeType: string
  sizeBytes: number
  uploadedBy: {
    id: number
    name: string
  }
  createdAt: string
  /** Presigned GET URL — may be absent if not requested */
  viewUrl?: string
}

export type ComprobanteErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_STATUS'
  | 'INVALID_MIME'
  | 'FILE_TOO_LARGE'
  | 'INTERNAL'

export class ComprobanteError extends Error {
  constructor(
    public readonly code: ComprobanteErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ComprobanteError'
  }
}

export interface RequestContext {
  userId: number
  email: string
  ipAddress?: string
  userAgent?: string
}

export interface PresignResponse {
  url: string
  key: string
}

export interface PersistComprobanteInput {
  key: string
  mime: string
  size: number
}
