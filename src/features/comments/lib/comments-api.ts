import type { CommentDTO, CreateCommentInput } from '../types/comment.types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`)
  }
  const body = (await res.json()) as { data: T }
  return body.data
}

export const commentsApi = {
  /** List the comment thread for a negocio, chronological (oldest -> newest) */
  list(businessId: number): Promise<CommentDTO[]> {
    return request(`/api/negocios/${businessId}/comments`)
  },

  /** Create a new comment on a negocio */
  create(businessId: number, input: CreateCommentInput): Promise<CommentDTO> {
    return request(`/api/negocios/${businessId}/comments`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
