import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/features/production-dashboard/services/by-status.service', () => ({
  getBusinessesByStatusRaw: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data: unknown, init?: { status?: number }) => ({
        json: () => Promise.resolve(data),
        status: init?.status ?? 200,
      })),
    },
  }
})

import { getBusinessesByStatusRaw } from '@/features/production-dashboard/services/by-status.service'
import { GET } from '../route'

const mockAuth = vi.mocked(auth)
const mockGetByStatusRaw = vi.mocked(getBusinessesByStatusRaw)

const BASE_URL = 'http://localhost/api/production-dashboard/by-status'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL(BASE_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const authedSession = { user: { id: '1', name: 'Test User', email: 'test@example.com' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/production-dashboard/by-status', () => {
  it('returns 401 when auth returns null', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest({ userIds: '1' }))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.data).toBeNull()
    expect(body.error).toBe('No autorizado')
  })

  it('returns 400 when userIds param is missing', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('El parámetro userIds es requerido')
  })

  it('returns 400 when userIds contains non-integer values', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest({ userIds: 'abc' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('El parámetro userIds contiene valores inválidos')
  })

  it('returns 200 with empty array when userIds is empty CSV — service NOT called', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest({ userIds: '' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(mockGetByStatusRaw).not.toHaveBeenCalled()
  })

  it('returns 200 with service data in ApiResponse wrapper', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetByStatusRaw.mockResolvedValue([
      { status: 'VENTA_EFECTUADA', count: 30, currencyId: 1, totalValue: 0 },
      { status: 'EMITIDO', count: 70, currencyId: 1, totalValue: 0 },
    ])
    const res = await GET(makeRequest({ userIds: '1,2' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].status).toBe('VENTA_EFECTUADA')
    expect(body.data[0].count).toBe(30)
  })

  it('returns 200 with empty array when service returns empty result', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetByStatusRaw.mockResolvedValue([])
    const res = await GET(makeRequest({ userIds: '99' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns 500 when service throws', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetByStatusRaw.mockRejectedValue(new Error('DB error'))
    const res = await GET(makeRequest({ userIds: '1' }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.data).toBeNull()
  })
})
