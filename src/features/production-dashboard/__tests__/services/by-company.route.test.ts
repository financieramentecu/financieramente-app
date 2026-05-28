import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/features/production-dashboard/services/company-donut.service', () => ({
  getCompanyDonutRaw: vi.fn(),
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

import { getCompanyDonutRaw } from '@/features/production-dashboard/services/company-donut.service'
import { GET } from '../../../../app/api/production-dashboard/by-company/route'

const mockAuth = vi.mocked(auth)
const mockGetCompanyDonutRaw = vi.mocked(getCompanyDonutRaw)

const BASE_URL = 'http://localhost/api/production-dashboard/by-company'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL(BASE_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const authedSession = { user: { id: '1', name: 'Test User', email: 'test@example.com' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/production-dashboard/by-company', () => {
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

  it('returns 400 when userIds contains floats', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest({ userIds: '1.5,2' }))
    const body = await res.json()
    expect(res.status).toBe(400)
  })

  it('returns 200 with empty array when userIds is empty CSV — service NOT called', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest({ userIds: '' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(mockGetCompanyDonutRaw).not.toHaveBeenCalled()
  })

  it('returns 200 with data from service when userIds=1,2', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const mockData = [
      {
        companyId: 1,
        companyName: 'SKANDIA',
        currencyId: 2,
        currencyName: 'Dólar',
        currencySymbol: 'USD',
        count: 5,
        totalValue: 50000,
      },
    ]
    mockGetCompanyDonutRaw.mockResolvedValue(mockData)

    const res = await GET(makeRequest({ userIds: '1,2' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(mockData)
  })

  it('calls getCompanyDonutRaw with parsed userIds and appliedFilters', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetCompanyDonutRaw.mockResolvedValue([])

    await GET(makeRequest({ userIds: '3,5', statuses: 'EMITIDO', categoryIds: '1,2' }))

    expect(mockGetCompanyDonutRaw).toHaveBeenCalledOnce()
    const callArg = mockGetCompanyDonutRaw.mock.calls[0][0]
    expect(callArg.userIds).toEqual([3, 5])
    expect(callArg.appliedFilters.statuses).toEqual(['EMITIDO'])
    expect(callArg.appliedFilters.categoryIds).toEqual([1, 2])
  })

  it('returns 500 when service throws an unexpected error', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetCompanyDonutRaw.mockRejectedValue(new Error('DB connection failed'))

    const res = await GET(makeRequest({ userIds: '1' }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.data).toBeNull()
    expect(body.error).toBe('Error interno del servidor')
  })
})
