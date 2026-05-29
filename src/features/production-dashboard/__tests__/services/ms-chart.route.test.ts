import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/features/production-dashboard/services/ms-chart.service', () => ({
  getMsChartRaw: vi.fn(),
  buildProductionWhereClause: vi.fn(),
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

import { getMsChartRaw } from '@/features/production-dashboard/services/ms-chart.service'
import { GET } from '../../../../app/api/production-dashboard/ms-chart/route'

const mockAuth = vi.mocked(auth)
const mockGetMsChartRaw = vi.mocked(getMsChartRaw)

const BASE_URL = 'http://localhost/api/production-dashboard/ms-chart'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL(BASE_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const authedSession = { user: { id: '1', name: 'Test User', email: 'test@example.com' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/production-dashboard/ms-chart', () => {
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

  it('returns 400 when userIds contains invalid values', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest({ userIds: 'abc' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('El parámetro userIds contiene valores inválidos')
  })

  it('returns 200 with empty array when userIds is empty string — service NOT called', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest({ userIds: '' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(mockGetMsChartRaw).not.toHaveBeenCalled()
  })

  it('returns 200 with data from service when userIds=1,2', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const mockData = [
      { userId: 1, currencyType: 1, totalAmount: 500000, count: 3 },
      { userId: 2, currencyType: 2, totalAmount: 10000, count: 1 },
    ]
    mockGetMsChartRaw.mockResolvedValue(mockData)

    const res = await GET(makeRequest({ userIds: '1,2' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(mockData)
  })

  it('returns 500 when service throws an unexpected error', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetMsChartRaw.mockRejectedValue(new Error('DB connection failed'))

    const res = await GET(makeRequest({ userIds: '1' }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.data).toBeNull()
    expect(body.error).toBe('Error interno del servidor')
  })
})
