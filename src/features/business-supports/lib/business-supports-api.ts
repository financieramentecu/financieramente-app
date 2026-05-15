import type {
  BusinessSupportDTO,
  PersistComprobanteInput,
  PresignResponse,
} from '../types/business-support.types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`,
    )
  }
  const body = await res.json() as { data: T }
  return body.data
}

export const businessSupportsApi = {
  /** List active comprobantes for a negocio */
  list(businessId: number): Promise<BusinessSupportDTO[]> {
    return request(`/api/negocios/${businessId}/comprobantes`)
  },

  /** Request a presigned PUT URL for direct upload */
  presign(
    businessId: number,
    mime: string,
    size: number,
  ): Promise<PresignResponse> {
    return request(`/api/negocios/${businessId}/comprobantes/presign`, {
      method: 'POST',
      body: JSON.stringify({ mime, size }),
    })
  },

  /** Persist the record after the client has uploaded to Spaces */
  persist(
    businessId: number,
    input: PersistComprobanteInput,
  ): Promise<BusinessSupportDTO> {
    return request(`/api/negocios/${businessId}/comprobantes`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  /** Soft-delete a comprobante (sets status = false) */
  remove(businessId: number, supportId: string): Promise<{ success: true }> {
    return request(
      `/api/negocios/${businessId}/comprobantes/${supportId}`,
      { method: 'DELETE' },
    )
  },
}
