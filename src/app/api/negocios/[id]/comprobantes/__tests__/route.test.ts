import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { email: 'agent@example.com', id: '1' },
  }),
}))

vi.mock('@/features/business-supports/services/business-supports.service', () => ({
  listComprobantes: vi.fn(),
  persistComprobante: vi.fn(),
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
import {
  listComprobantes,
  persistComprobante,
} from '@/features/business-supports/services/business-supports.service'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'

const mockList = listComprobantes as ReturnType<typeof vi.fn>
const mockPersist = persistComprobante as ReturnType<typeof vi.fn>

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/negocios/10/comprobantes', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const routeParams = { params: Promise.resolve({ id: '10' }) }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/negocios/[id]/comprobantes', () => {
  it('returns 200 with comprobantes list', async () => {
    const comprobantes = [
      {
        id: 'supp-1',
        businessId: 10,
        objectKey: 'prod/negocios/CTR-001/comprobantes/file.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        uploadedBy: { id: 1, name: 'John' },
        createdAt: '2026-05-14T00:00:00Z',
        viewUrl: 'https://view.example.com/url',
      },
    ]
    mockList.mockResolvedValue(comprobantes)

    const res = await GET(makeRequest(), routeParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('supp-1')
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValueOnce(null)

    const res = await GET(makeRequest(), routeParams)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/negocios/[id]/comprobantes', () => {
  it('returns 201 with created DTO on happy path', async () => {
    const dto = {
      id: 'supp-1',
      businessId: 10,
      objectKey: 'prod/negocios/CTR-001/comprobantes/file.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      uploadedBy: { id: 1, name: 'John' },
      createdAt: '2026-05-14T00:00:00Z',
    }
    mockPersist.mockResolvedValue(dto)

    const req = makeRequest({ key: 'prod/negocios/CTR-001/comprobantes/file.jpg', mime: 'image/jpeg', size: 1024 })
    const res = await POST(req, routeParams)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBe('supp-1')
  })

  it('returns 422 when body is missing key', async () => {
    const req = makeRequest({ mime: 'image/jpeg', size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when body is missing mime', async () => {
    const req = makeRequest({ key: 'some/key.jpg', size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when body is missing size', async () => {
    const req = makeRequest({ key: 'some/key.jpg', mime: 'image/jpeg' })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })

  it('returns 422 when service throws INVALID_MIME', async () => {
    mockPersist.mockRejectedValue(new ComprobanteError('INVALID_MIME', 'bad mime'))
    const req = makeRequest({ key: 'some/key.jpg', mime: 'image/jpeg', size: 1024 })
    const res = await POST(req, routeParams)
    expect(res.status).toBe(422)
  })
})
