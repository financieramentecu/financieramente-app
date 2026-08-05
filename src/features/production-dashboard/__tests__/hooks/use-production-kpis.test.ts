import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mock context hooks before importing the hook under test
vi.mock('../../components/HierarchySelectionContext', () => ({
  useHierarchySelection: vi.fn(),
}))
vi.mock('../../components/DashboardFilterContext', () => ({
  useDashboardFilter: vi.fn(),
}))

import { useHierarchySelection } from '../../components/HierarchySelectionContext'
import { useDashboardFilter } from '../../components/DashboardFilterContext'
import { useProductionKpis } from '../../hooks/use-production-kpis'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)
const mockUseDashboardFilter = vi.mocked(useDashboardFilter)

const defaultFilters: DashboardAppliedFilters = {
  dateRange: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
  statuses: [],
  categoryIds: [],
  companyIds: [],
  productIds: [],
  originIds: [],
  plazos: [],
  periodicidades: [],
  isInternacional: false,
}

function setupMocks(userIds: number[], filters = defaultFilters) {
  mockUseHierarchySelection.mockReturnValue({
    selectedUserIds: userIds,
    nodes: [],
    toggle: vi.fn(),
    dispatch: vi.fn(),
  })
  mockUseDashboardFilter.mockReturnValue({
    draft: filters,
    appliedFilters: filters,
    dispatch: vi.fn(),
    isApplyEnabled: false,
    periodLabel: 'Jan 2025',
    activeBadges: [],
  })
}

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

function mockKpiFetch(payload: {
  totalCop: number
  totalForeignUsd: number
  nationalCount: number
  foreignCount: number
}) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: payload }),
  } as Response)
}

describe('useProductionKpis', () => {
  it('returns zeros immediately without fetching when selectedUserIds is empty', async () => {
    setupMocks([])
    global.fetch = vi.fn()

    const { result } = renderHook(() => useProductionKpis(4050))

    // Should NOT be loading — immediate zero result
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.current.computed?.detaileForeignUsd).toBe(0)
    expect(result.current.computed?.nationalUsd).toBe(0)
    expect(result.current.computed?.totalUsd).toBe(0)
  })

  it('fetches KPIs when selectedUserIds is non-empty', async () => {
    setupMocks([1, 2])
    mockKpiFetch({ totalCop: 8100000, totalForeignUsd: 500, nationalCount: 3, foreignCount: 2 })

    const { result } = renderHook(() => useProductionKpis(4050))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(global.fetch).toHaveBeenCalledOnce()
    expect(result.current.isError).toBe(false)
  })

  it('computes nationalUsd = totalCop / trm', async () => {
    setupMocks([1])
    mockKpiFetch({ totalCop: 8100000, totalForeignUsd: 500, nationalCount: 3, foreignCount: 2 })

    const { result } = renderHook(() => useProductionKpis(4050))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // nationalUsd = 8100000 / 4050 = 2000
    expect(result.current.computed?.nationalUsd).toBeCloseTo(2000)
    // totalUsd = 2000 + 500 = 2500
    expect(result.current.computed?.totalUsd).toBeCloseTo(2500)
    expect(result.current.computed?.detaileForeignUsd).toBe(500)
  })

  it('guards against division by zero when trm is 0', async () => {
    setupMocks([1])
    mockKpiFetch({ totalCop: 8100000, totalForeignUsd: 500, nationalCount: 3, foreignCount: 2 })

    const { result } = renderHook(() => useProductionKpis(0))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.computed?.nationalUsd).toBe(0)
    expect(result.current.computed?.totalUsd).toBe(500) // only foreign
  })

  it('shows loading state during fetch', () => {
    setupMocks([1])
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useProductionKpis(4050))

    expect(result.current.isLoading).toBe(true)
  })

  it('sets isError on fetch failure', async () => {
    setupMocks([1])
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useProductionKpis(4050))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(true)
  })

  it('re-fetches when appliedFilters changes', async () => {
    setupMocks([1])
    mockKpiFetch({ totalCop: 0, totalForeignUsd: 0, nationalCount: 0, foreignCount: 0 })

    const { result, rerender } = renderHook(() => useProductionKpis(4050))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const initialCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length

    // Change filters
    act(() => {
      mockUseDashboardFilter.mockReturnValue({
        draft: defaultFilters,
        appliedFilters: { ...defaultFilters, categoryIds: [5] },
        dispatch: vi.fn(),
        isApplyEnabled: false,
        periodLabel: 'Jan 2025',
        activeBadges: [],
      })
    })

    rerender()
    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  it('serializes hasSupports=true in the KPIs query string', async () => {
    setupMocks([1], { ...defaultFilters, hasSupports: true })
    mockKpiFetch({ totalCop: 0, totalForeignUsd: 0, nationalCount: 0, foreignCount: 0 })

    renderHook(() => useProductionKpis(4050))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('hasSupports=true')
  })

  it('serializes hasSupports=false in the KPIs query string', async () => {
    setupMocks([1], { ...defaultFilters, hasSupports: false })
    mockKpiFetch({ totalCop: 0, totalForeignUsd: 0, nationalCount: 0, foreignCount: 0 })

    renderHook(() => useProductionKpis(4050))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('hasSupports=false')
  })

  it('omits hasSupports from the KPIs query string when undefined', async () => {
    setupMocks([1])
    mockKpiFetch({ totalCop: 0, totalForeignUsd: 0, nationalCount: 0, foreignCount: 0 })

    renderHook(() => useProductionKpis(4050))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).not.toContain('hasSupports')
  })
})
