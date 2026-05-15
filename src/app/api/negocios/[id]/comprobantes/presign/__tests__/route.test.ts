import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { email: 'agent@example.com', id: '1' },
  }),
}))

vi.mock('@/features/business-supports/services/business-supports.service', () => ({
  presignComprobanteUpload: vi.fn(),
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

import { POST } from '../route'
import {
  presignComprobanteUpload,
} from '@/features/business-supports/services/business-supports.service'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'

const mockPresign = presignComprobanteUpload as ReturnType<typeof vi.fn>

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/negocios/10/comprobantes/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const routeParams = { params: Promise.resolve({ id: '10' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/negocios/[id]/comprobantes/presign', () => {
  it('returns 200 with url and key on happy path', async () => {
    mockPresign.mockResolvedValue({
      url: 'https://presigned.example.com/url',
      key: 'prod/negocios/CTR-001/comprobantes/file.jpg',
    })

    const req = makeRequest({ mime: 'image/jpeg', size: 1024 })
    const res = await POST(req, routeParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.url).toBe('https://presigned.example.com/url')
    expect(body.data.key).toContain('CTR-001')
  })

  it('returns 422 when mime is missing', async () => {
    const req = makeRequest({ size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when size is missing', async () => {
    const req = makeRequest({ mime: 'image/jpeg' })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when service throws INVALID_MIME', async () => {
    mockPresign.mockRejectedValue(new ComprobanteError('INVALID_MIME', 'bad mime'))
    const req = makeRequest({ mime: 'application/pdf', size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when service throws INVALID_STATUS', async () => {
    mockPresign.mockRejectedValue(new ComprobanteError('INVALID_STATUS', 'wrong status'))
    const req = makeRequest({ mime: 'image/jpeg', size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 404 when service throws NOT_FOUND', async () => {
    mockPresign.mockRejectedValue(new ComprobanteError('NOT_FOUND', 'not found'))
    const req = makeRequest({ mime: 'image/jpeg', size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValueOnce(null)
    const req = makeRequest({ mime: 'image/jpeg', size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(401)
  })
})
