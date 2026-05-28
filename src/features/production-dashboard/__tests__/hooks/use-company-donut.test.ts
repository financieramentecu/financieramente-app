import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock context hooks and next-auth before importing the hook under test
vi.mock('../../components/HierarchySelectionContext', () => ({
  useHierarchySelection: vi.fn(),
}))
vi.mock('../../components/DashboardFilterContext', () => ({
  useDashboardFilter: vi.fn(),
}))
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

import { useHierarchySelection } from '../../components/HierarchySelectionContext'
import { useDashboardFilter } from '../../components/DashboardFilterContext'
import { useSession } from 'next-auth/react'
import { useCompanyDonut } from '../../hooks/use-company-donut'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'
import type { AsyncSuccessState } from '@/features/shared/types/async-state.types'
import type { CompanyDonutSlice } from '../../types/production-kpi.types'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)
const mockUseDashboardFilter = vi.mocked(useDashboardFilter)
const mockUseSession = vi.mocked(useSession)

const defaultFilters: DashboardAppliedFilters = {
  dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
  statuses: [],
  categoryIds: [],
  companyIds: [],
  productIds: [],
  originIds: [],
  plazos: [],
  periodicidades: [],
  isInternacional: false,
}

function setupMocks(
  opts: {
    nodes?: { userId: number; included: boolean }[]
    selectedUserIds?: readonly number[]
    sessionUserId?: string | null
    sessionStatus?: 'loading' | 'authenticated' | 'unauthenticated'
    filters?: DashboardAppliedFilters
  } = {}
) {
  const {
    nodes = [],
    selectedUserIds = [],
    sessionUserId = '99',
    sessionStatus = 'authenticated',
    filters = defaultFilters,
  } = opts

  mockUseHierarchySelection.mockReturnValue({
    nodes: nodes.map((n) => ({
      userId: n.userId,
      fullName: `User ${n.userId}`,
      levelCode: 'MS_JUNIOR',
      levelColor: '',
      categoryName: '',
      idCategory: null,
      included: n.included,
      children: [],
    })),
    selectedUserIds,
    toggle: vi.fn(),
    dispatch: vi.fn(),
  })
  mockUseDashboardFilter.mockReturnValue({
    draft: filters,
    appliedFilters: filters,
    dispatch: vi.fn(),
    isApplyEnabled: false,
    periodLabel: 'Jan 2026',
    activeBadges: [],
  })
  if (sessionUserId) {
    mockUseSession.mockReturnValue({
      data: { user: { id: sessionUserId, name: 'Test', email: 'test@test.com' }, expires: '' },
      status: sessionStatus as 'authenticated',
      update: vi.fn(),
    })
  } else {
    mockUseSession.mockReturnValue({
      data: null,
      status: sessionStatus as 'loading' | 'unauthenticated',
      update: vi.fn(),
    })
  }
}

const sampleRaw = [
  {
    companyId: 1,
    companyName: 'SKANDIA',
    currencyId: 2,
    currencyName: 'Dólar',
    currencySymbol: 'USD',
    count: 10,
    totalValue: 100000,
  },
  {
    companyId: 2,
    companyName: 'TRINITY',
    currencyId: 1,
    currencyName: 'Peso colombiano',
    currencySymbol: 'COP',
    count: 10,
    totalValue: 50000000,
  },
]

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('useCompanyDonut', () => {
  it('returns loading state when sessionStatus is loading and no nodes', () => {
    setupMocks({ sessionStatus: 'loading', nodes: [], selectedUserIds: [] })
    const { result } = renderHook(() => useCompanyDonut())
    expect(result.current.status).toBe('loading')
  })

  it('returns error state when unauthenticated and no nodes', () => {
    setupMocks({
      nodes: [],
      selectedUserIds: [],
      sessionUserId: null,
      sessionStatus: 'unauthenticated',
    })
    const { result } = renderHook(() => useCompanyDonut())
    expect(result.current.status).toBe('error')
  })

  it('transitions loading → success on happy path (MS Junior: no hierarchy nodes)', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '42' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleRaw }),
    } as Response)

    const { result } = renderHook(() => useCompanyDonut())

    await waitFor(() => expect(result.current.status).toBe('success'))

    const success = result.current as AsyncSuccessState<CompanyDonutSlice[]>
    expect(success.data).toHaveLength(2)
    // Each slice should have percentage and fill set by aggregateCompanyDonut
    expect(success.data[0].percentage).toBe(50)
    expect(success.data[0].fill).toBeTruthy()
  })

  it('passes aggregated data with correct percentage sum (~100)', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '5' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { companyId: 1, companyName: 'SKANDIA', currencyId: 2, currencyName: 'USD', currencySymbol: 'USD', count: 30, totalValue: 30000 },
          { companyId: 2, companyName: 'TRINITY', currencyId: 1, currencyName: 'COP', currencySymbol: 'COP', count: 70, totalValue: 70000000 },
        ],
      }),
    } as Response)

    const { result } = renderHook(() => useCompanyDonut())

    await waitFor(() => expect(result.current.status).toBe('success'))
    const success = result.current as AsyncSuccessState<CompanyDonutSlice[]>
    const total = success.data.reduce((s, d) => s + d.percentage, 0)
    expect(total).toBeGreaterThan(99.5)
    expect(total).toBeLessThanOrEqual(100.1)
  })

  it('transitions to error state when fetch returns non-OK response', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '42' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: 'Server error' }),
    } as Response)

    const { result } = renderHook(() => useCompanyDonut())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeTruthy()
  })

  it('transitions to error state when fetch rejects (network failure)', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '42' })

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCompanyDonut())

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('re-fetches when selectedUserIds changes', async () => {
    setupMocks({
      nodes: [{ userId: 1, included: true }],
      selectedUserIds: [1],
      sessionUserId: '99',
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleRaw }),
    } as Response)
    global.fetch = fetchMock

    const { result, rerender } = renderHook(() => useCompanyDonut())

    await waitFor(() => expect(result.current.status).toBe('success'))

    const callsAfterFirst = fetchMock.mock.calls.length

    // Update selectedUserIds
    mockUseHierarchySelection.mockReturnValue({
      nodes: [
        {
          userId: 1,
          fullName: 'User 1',
          levelCode: 'MS_JUNIOR',
          levelColor: '',
          categoryName: '',
          idCategory: null,
          included: true,
          children: [],
        },
        {
          userId: 2,
          fullName: 'User 2',
          levelCode: 'MS_JUNIOR',
          levelColor: '',
          categoryName: '',
          idCategory: null,
          included: true,
          children: [],
        },
      ],
      selectedUserIds: [1, 2],
      toggle: vi.fn(),
      dispatch: vi.fn(),
    })

    rerender()

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    })

    const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0])
    expect(lastUrl).toContain('userIds=1%2C2')
  })

  it('does not apply stale response after unmount (cancelled flag)', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '42' })

    let resolveFetch!: (value: unknown) => void
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    const { result, unmount } = renderHook(() => useCompanyDonut())

    // Should be loading
    expect(result.current.status).toBe('loading')

    // Unmount before fetch resolves
    unmount()

    // Resolve after unmount — should not throw or update state
    resolveFetch({
      ok: true,
      json: async () => ({ data: sampleRaw }),
    })

    // No assertion on state — the test validates no errors are thrown
    // (cancelled flag prevents setState after unmount)
    await vi.waitFor(() => true, { timeout: 100 })
  })

  it('uses hierarchy selectedUserIds when nodes are present', async () => {
    setupMocks({
      nodes: [
        { userId: 10, included: true },
        { userId: 11, included: true },
      ],
      selectedUserIds: [10, 11],
      sessionUserId: '99',
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    global.fetch = fetchMock

    const { result } = renderHook(() => useCompanyDonut())

    await waitFor(() => expect(result.current.status).toBe('success'))

    const callUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(callUrl).toContain('userIds=10%2C11')
  })
})
