import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/features/shared/services/user.service', () => ({
  getCurrentUserByEmail: vi.fn(),
}))

vi.mock('@/features/production-dashboard/services/heatmap.service', () => ({
  getHeatmapRaw: vi.fn(),
  resolveViewerScope: vi.fn(),
  buildLevelOrderMap: vi.fn(),
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

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { getHeatmapRaw, resolveViewerScope } from '@/features/production-dashboard/services/heatmap.service'
import { GET } from '../../../../app/api/production-dashboard/heatmap/route'

const mockAuth = vi.mocked(auth)
const mockGetCurrentUser = vi.mocked(getCurrentUserByEmail)
const mockGetHeatmapRaw = vi.mocked(getHeatmapRaw)
const mockResolveViewerScope = vi.mocked(resolveViewerScope)

const viewerUser = {
  idUser: 1,
  name: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  active: true,
  idLevel: 3,
  idCategory: null,
  idUserLeader: null,
  role: { code: 'DEFAULT' },
  level: { code: 'MS_SENIOR' },
}

const BASE_URL = 'http://localhost/api/production-dashboard/heatmap'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL(BASE_URL)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const authedSession = {
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: { code: 'DEFAULT' },
    level: { code: 'MS_SENIOR' },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/production-dashboard/heatmap', () => {
  it('(a) returns 401 when auth returns null', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest({ userIds: '1' }))
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.data).toBeNull()
    expect(body.error).toBe('No autorizado')
  })

  it('(b) returns 400 when userIds param is missing', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBeTruthy()
  })

  it('(c) returns 200 with ApiResponse<HeatmapRaw[]> for valid session and params', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetCurrentUser.mockResolvedValue(viewerUser)
    const mockData = [
      {
        idUser: 1,
        fullName: 'Ana García',
        levelCode: 'MS_SENIOR',
        levelOrder: 2,
        levelColor: '#333',
        categoryName: 'Cat A',
        idCategory: 10,
        cells: [{ idCompany: 5, companyName: 'Empresa X', copTotal: 100000, foreignUsdTotal: 0, count: 1 }],
      },
    ]
    mockResolveViewerScope.mockResolvedValue([1])
    mockGetHeatmapRaw.mockResolvedValue(mockData)

    const res = await GET(makeRequest({ userIds: '1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual(mockData)
  })

  it('(d) isInternacional query param is discarded before service call', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetCurrentUser.mockResolvedValue(viewerUser)
    mockResolveViewerScope.mockResolvedValue([1])
    mockGetHeatmapRaw.mockResolvedValue([])

    await GET(makeRequest({ userIds: '1', isInternacional: 'true' }))

    const serviceCallArgs = mockGetHeatmapRaw.mock.calls[0]?.[0]
    // The appliedFilters passed to the service must not contain isInternacional=true
    // (it should be discarded or set to false by default)
    expect(serviceCallArgs?.appliedFilters.isInternacional).toBe(false)
  })

  it('(e) returns 200 with empty array when userIds is empty string — service NOT called', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    const res = await GET(makeRequest({ userIds: '' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(mockGetHeatmapRaw).not.toHaveBeenCalled()
  })

  it('(f) returns 500 when service throws', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetCurrentUser.mockResolvedValue(viewerUser)
    mockResolveViewerScope.mockResolvedValue([1])
    mockGetHeatmapRaw.mockRejectedValue(new Error('DB error'))

    const res = await GET(makeRequest({ userIds: '1' }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.data).toBeNull()
  })

  it('(g) intersects caller userIds with viewer scope', async () => {
    mockAuth.mockResolvedValue(authedSession as never)
    mockGetCurrentUser.mockResolvedValue(viewerUser)
    // Viewer scope = [1, 2, 3], caller asks for [1, 2, 4]
    // Intersection = [1, 2]
    mockResolveViewerScope.mockResolvedValue([1, 2, 3])
    mockGetHeatmapRaw.mockResolvedValue([])

    await GET(makeRequest({ userIds: '1,2,4' }))

    const serviceCallArgs = mockGetHeatmapRaw.mock.calls[0]?.[0]
    expect(serviceCallArgs?.userIds).toContain(1)
    expect(serviceCallArgs?.userIds).toContain(2)
    expect(serviceCallArgs?.userIds).not.toContain(4)
  })
})
