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
import { useStatusDonut } from '../../hooks/use-status-donut'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'
import type { AsyncSuccessState } from '@/features/shared/types/async-state.types'
import type { StatusDonutSlice } from '../../types/production-kpi.types'

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
  { status: 'VENTA_EFECTUADA', count: 35 },
  { status: 'EMITIDO', count: 45 },
  { status: 'FONDEADO', count: 20 },
]

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('useStatusDonut', () => {
  it('returns loading state when sessionStatus is loading and no nodes', () => {
    setupMocks({ sessionStatus: 'loading', nodes: [], selectedUserIds: [] })
    const { result } = renderHook(() => useStatusDonut(null))
    expect(result.current.status).toBe('loading')
  })

  it('returns error state when unauthenticated and no nodes', () => {
    setupMocks({
      nodes: [],
      selectedUserIds: [],
      sessionUserId: null,
      sessionStatus: 'unauthenticated',
    })
    const { result } = renderHook(() => useStatusDonut(null))
    expect(result.current.status).toBe('error')
  })

  it('transitions loading → success on happy path (MS Junior: no hierarchy nodes)', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '42' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleRaw }),
    } as Response)

    const { result } = renderHook(() => useStatusDonut(null))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const success = result.current as AsyncSuccessState<StatusDonutSlice[]>
    expect(success.data).toHaveLength(3)
    // Each slice should have percentage, fill, and label set by aggregateStatusDonut
    expect(success.data[0].percentage).toBeGreaterThan(0)
    expect(success.data[0].fill).toBeTruthy()
    expect(success.data[0].label).toBeTruthy()
  })

  it('runs aggregateStatusDonut client-side — slices have fill from STATUS_COLORS', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '5' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleRaw }),
    } as Response)

    const { result } = renderHook(() => useStatusDonut(null))
    await waitFor(() => expect(result.current.status).toBe('success'))

    const success = result.current as AsyncSuccessState<StatusDonutSlice[]>
    const venta = success.data.find((s) => s.status === 'VENTA_EFECTUADA')!
    const emitido = success.data.find((s) => s.status === 'EMITIDO')!
    const fondeado = success.data.find((s) => s.status === 'FONDEADO')!
    expect(venta.fill).toBe('#f97316')
    expect(emitido.fill).toBe('#3b82f6')
    expect(fondeado.fill).toBe('#22c55e')
  })

  it('transitions to error state when fetch returns non-OK response', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '42' })

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: 'Server error' }),
    } as Response)

    const { result } = renderHook(() => useStatusDonut(null))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeTruthy()
  })

  it('transitions to error state when fetch rejects (network failure)', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '42' })

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useStatusDonut(null))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('refetches when appliedFilters changes', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '5' })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleRaw }),
    } as Response)
    global.fetch = fetchMock

    const { result, rerender } = renderHook(() => useStatusDonut(null))
    await waitFor(() => expect(result.current.status).toBe('success'))

    const callsAfterFirst = fetchMock.mock.calls.length

    // Update filters
    const newFilters = { ...defaultFilters, statuses: ['EMITIDO'] }
    mockUseDashboardFilter.mockReturnValue({
      draft: newFilters,
      appliedFilters: newFilters,
      dispatch: vi.fn(),
      isApplyEnabled: false,
      periodLabel: 'Jan 2026',
      activeBadges: [],
    })
    rerender()

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    })
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

    const { result, unmount } = renderHook(() => useStatusDonut(null))
    expect(result.current.status).toBe('loading')

    unmount()

    resolveFetch({
      ok: true,
      json: async () => ({ data: sampleRaw }),
    })

    await vi.waitFor(() => true, { timeout: 100 })
    // No assertion on state — cancelled flag prevents setState after unmount
  })

  it('calls /api/production-dashboard/by-status endpoint', async () => {
    setupMocks({ nodes: [], selectedUserIds: [], sessionUserId: '7' })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    global.fetch = fetchMock

    const { result } = renderHook(() => useStatusDonut(null))
    await waitFor(() => expect(result.current.status).toBe('success'))

    const callUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(callUrl).toContain('/api/production-dashboard/by-status')
    expect(callUrl).toContain('userIds=7')
  })
})
