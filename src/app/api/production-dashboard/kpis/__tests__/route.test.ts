import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/production-dashboard/services/production-kpi.service', () => ({
  getProductionKpiRaw: vi.fn(),
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

import { getProductionKpiRaw } from '@/features/production-dashboard/services/production-kpi.service'
import { GET } from '@/app/api/production-dashboard/kpis/route'

const mockAuth = vi.mocked(auth)
const mockGetProductionKpiRaw = vi.mocked(getProductionKpiRaw)

const BASE_URL = 'http://localhost/api/production-dashboard/kpis'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL(BASE_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const authenticatedSession = {
  user: { email: 'user@test.com' },
  expires: '2099-01-01',
} as unknown as Awaited<ReturnType<typeof auth>>

describe('GET /api/production-dashboard/kpis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.data).toBeNull()
  })

  it('returns 400 when userIds param is missing', async () => {
    mockAuth.mockResolvedValue(authenticatedSession)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.data).toBeNull()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when userIds param is malformed', async () => {
    mockAuth.mockResolvedValue(authenticatedSession)

    const response = await GET(makeRequest({ userIds: 'abc,def' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.data).toBeNull()
  })

  it('returns zeros when service returns zeros for empty userIds scope', async () => {
    mockAuth.mockResolvedValue(authenticatedSession)
    mockGetProductionKpiRaw.mockResolvedValue({
      totalCop: 0,
      totalForeignUsd: 0,
      nationalCount: 0,
      foreignCount: 0,
    })

    const response = await GET(makeRequest({ userIds: '1' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.totalCop).toBe(0)
    expect(body.data.totalForeignUsd).toBe(0)
  })

  it('delegates to service with parsed userIds and returns ProductionKpiRaw', async () => {
    mockAuth.mockResolvedValue(authenticatedSession)
    mockGetProductionKpiRaw.mockResolvedValue({
      totalCop: 8100000,
      totalForeignUsd: 500,
      nationalCount: 3,
      foreignCount: 2,
    })

    const response = await GET(makeRequest({ userIds: '10,11,12' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.totalCop).toBe(8100000)
    expect(body.data.totalForeignUsd).toBe(500)
    expect(body.data.nationalCount).toBe(3)
    expect(body.data.foreignCount).toBe(2)

    const callArgs = mockGetProductionKpiRaw.mock.calls[0][0]
    expect(callArgs.userIds).toEqual([10, 11, 12])
  })

  it('passes categoryIds filter when provided', async () => {
    mockAuth.mockResolvedValue(authenticatedSession)
    mockGetProductionKpiRaw.mockResolvedValue({
      totalCop: 0,
      totalForeignUsd: 0,
      nationalCount: 0,
      foreignCount: 0,
    })

    await GET(makeRequest({ userIds: '1', categoryIds: '5,6' }))

    const callArgs = mockGetProductionKpiRaw.mock.calls[0][0]
    expect(callArgs.appliedFilters.categoryIds).toEqual([5, 6])
  })
})
