import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { email: 'agent@example.com', id: '1' },
  }),
}))

vi.mock('@/features/comments/services/comments.service', () => ({
  getCommentsByBusinessId: vi.fn(),
  createComment: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: vi.fn().mockReturnValue('vitest'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ idUser: 1, email: 'agent@example.com' }),
    },
  },
}))

import { GET, POST } from '../route'
import { getCommentsByBusinessId, createComment } from '@/features/comments/services/comments.service'
import { CommentError } from '@/features/comments/types/comment.types'

const mockList = getCommentsByBusinessId as ReturnType<typeof vi.fn>
const mockCreate = createComment as ReturnType<typeof vi.fn>

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/negocios/10/comments', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const routeParams = { params: Promise.resolve({ id: '10' }) }

const DTO = {
  id: 'comment-1',
  businessId: 10,
  title: 'Seguimiento',
  detail: 'Falta el comprobante',
  author: { id: 1, name: 'Ana Agente', role: 'AGENTE' },
  createdAt: '2026-07-01T12:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/negocios/[id]/comments', () => {
  it('returns 200 with the chronological thread', async () => {
    mockList.mockResolvedValue([DTO])

    const res = await GET(makeRequest(), routeParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('comment-1')
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValueOnce(null)

    const res = await GET(makeRequest(), routeParams)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/negocios/[id]/comments', () => {
  it('returns 201 with the created comment on happy path (audit + notif fan-out handled in service)', async () => {
    mockCreate.mockResolvedValue(DTO)

    const req = makeRequest({ title: 'Seguimiento', detail: 'Falta el comprobante' })
    const res = await POST(req, routeParams)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBe('comment-1')
    expect(mockCreate).toHaveBeenCalledWith(
      10,
      { title: 'Seguimiento', detail: 'Falta el comprobante' },
      expect.objectContaining({ userId: 1, email: 'agent@example.com' }),
    )
  })

  it('returns 422 when title is missing', async () => {
    const req = makeRequest({ detail: 'Falta el comprobante' })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when detail is missing', async () => {
    const req = makeRequest({ title: 'Seguimiento' })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when title exceeds 40 chars', async () => {
    const req = makeRequest({ title: 'a'.repeat(41), detail: 'valid' })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when detail exceeds 200 chars', async () => {
    const req = makeRequest({ title: 'valid', detail: 'b'.repeat(201) })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 404 when service throws NOT_FOUND (notification failure does not block write for existing negocios)', async () => {
    mockCreate.mockRejectedValue(new CommentError('NOT_FOUND', 'negocio not found'))
    const req = makeRequest({ title: 'valid', detail: 'valid' })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 403 for CONSULTOR (read-only role) and does not call createComment', async () => {
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValueOnce({
      user: { email: 'consultor@example.com', id: '9', role: 'CONSULTOR' },
    } as never)

    const req = makeRequest({ title: 'valid', detail: 'valid' })
    const res = await POST(req, routeParams)

    expect(res.status).toBe(403)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
