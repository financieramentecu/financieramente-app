import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock context hooks before importing the hook under test
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
import { collectNodesInOrder, useMsBarChart } from '../../hooks/use-ms-bar-chart'
import type { HierarchyNode } from '../../types/hierarchy.types'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'
import type { AsyncSuccessState } from '@/features/shared/types/async-state.types'
import type { MsBarDatum } from '../../types/production-kpi.types'

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

function makeNode(
  userId: number,
  levelCode: string,
  included: boolean,
  children: HierarchyNode[] = []
): HierarchyNode {
  return {
    userId,
    fullName: `User ${userId}`,
    levelCode,
    levelColor: '',
    categoryName: '',
    idCategory: null,
    included,
    children,
  }
}

function setupMocks(nodes: HierarchyNode[], userIds: readonly number[] = []) {
  mockUseHierarchySelection.mockReturnValue({
    nodes,
    selectedUserIds: userIds,
    toggle: vi.fn(),
    dispatch: vi.fn(),
  })
  mockUseDashboardFilter.mockReturnValue({
    draft: defaultFilters,
    appliedFilters: defaultFilters,
    dispatch: vi.fn(),
    isApplyEnabled: false,
    periodLabel: 'Jan 2026',
    activeBadges: [],
  })
  mockUseSession.mockReturnValue({
    data: { user: { id: '99', name: 'Default User', email: 'default@test.com' }, expires: '' },
    status: 'authenticated',
    update: vi.fn(),
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

// ─── collectNodesInOrder pure function tests ──────────────────────────────────

describe('collectNodesInOrder', () => {
  it('depth-first, collects only included=true nodes, no levelCode filter', () => {
    const tree = [
      makeNode(10, 'TEAM_LEADER', true, [
        makeNode(11, 'MS_SENIOR', true),
        makeNode(12, 'MS_JUNIOR', false),
      ]),
    ]
    const result = collectNodesInOrder(tree, undefined)
    // userId 10 (included=true) and 11 (included=true) — 12 excluded
    expect(result.map((n) => n.userId)).toEqual([10, 11])
  })

  it('places self-node first regardless of tree position', () => {
    const tree = [
      makeNode(10, 'MS_SENIOR', true, [
        makeNode(11, 'MS_JUNIOR', true),
      ]),
    ]
    const result = collectNodesInOrder(tree, 10)
    // selfUserId=10 is already root but should still be first
    expect(result[0].userId).toBe(10)
    expect(result[1].userId).toBe(11)
  })

  it('includes TEAM_LEADER self-node and child MS_SENIOR', () => {
    const tree = [
      makeNode(5, 'TEAM_LEADER', true, [
        makeNode(11, 'MS_SENIOR', true),
      ]),
    ]
    const result = collectNodesInOrder(tree, 5)
    expect(result.map((n) => n.userId)).toEqual([5, 11])
  })

  it('returns empty array when no nodes are included', () => {
    const tree = [makeNode(1, 'MS_SENIOR', false)]
    expect(collectNodesInOrder(tree, undefined)).toEqual([])
  })
})

// ─── useMsBarChart hook tests ─────────────────────────────────────────────────

describe('useMsBarChart', () => {
  it('uses session userId when nodes is empty (MS Junior path)', async () => {
    mockUseHierarchySelection.mockReturnValue({
      nodes: [],
      selectedUserIds: [],
      toggle: vi.fn(),
      dispatch: vi.fn(),
    })
    mockUseDashboardFilter.mockReturnValue({
      draft: defaultFilters,
      appliedFilters: defaultFilters,
      dispatch: vi.fn(),
      isApplyEnabled: false,
      periodLabel: '',
      activeBadges: [],
    })
    mockUseSession.mockReturnValue({
      data: { user: { id: '42', name: 'Jhon MS', email: 'jhon@test.com' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ userId: 42, currencyType: 1, totalAmount: 100000, count: 3 }],
      }),
    } as Response)

    const { result } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data
    expect(data).toHaveLength(1)
    expect(data[0].userId).toBe(42)
  })

  it('sets nationalUsd to null for all entries when trmRate is null', async () => {
    const nodes = [makeNode(1, 'MS_SENIOR', true)]
    setupMocks(nodes, [1])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { userId: 1, currencyType: 1, totalAmount: 500000, count: 2 },
          { userId: 1, currencyType: 2, totalAmount: 10000, count: 1 },
        ],
      }),
    } as Response)

    const { result } = renderHook(() => useMsBarChart(null))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data
    expect(data.every((d) => d.nationalUsd === null)).toBe(true)
    expect(data.every((d) => d.nationalUsdDisplay === 0)).toBe(true)
  })

  it('transitions to error state on API fetch failure', async () => {
    const nodes = [makeNode(1, 'MS_SENIOR', true)]
    setupMocks(nodes, [1])

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeTruthy()
  })

  it('transitions to error state on non-200 response', async () => {
    const nodes = [makeNode(1, 'MS_SENIOR', true)]
    setupMocks(nodes, [1])

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: 'Server error' }),
    } as Response)

    const { result } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('ordering matches tree order: first self-node, then depth-first children', async () => {
    const nodes = [
      makeNode(1, 'MS_SENIOR', true, [
        makeNode(2, 'MS_JUNIOR', true),
      ]),
    ]
    // selfUserId from session is '99' — neither 1 nor 2, so no self-node prepend
    setupMocks(nodes, [1, 2])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { userId: 2, currencyType: 1, totalAmount: 50000, count: 1 },
          { userId: 1, currencyType: 2, totalAmount: 20000, count: 2 },
        ],
      }),
    } as Response)

    const { result } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data
    // Ordering follows tree order: 1 first (root), then 2 (child)
    expect(data[0].userId).toBe(1)
    expect(data[1].userId).toBe(2)
  })

  it('excludes unchecked MS from chart data when node is not included (AC-8)', async () => {
    const nodesWithBoth = [
      makeNode(1, 'MS_SENIOR', true),
      makeNode(2, 'MS_JUNIOR', true),
    ]
    setupMocks(nodesWithBoth, [1, 2])

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { userId: 1, currencyType: 2, totalAmount: 10000, count: 1 },
          { userId: 2, currencyType: 1, totalAmount: 50000, count: 2 },
        ],
      }),
    } as Response)
    global.fetch = fetchMock

    const { result, rerender } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect((result.current as AsyncSuccessState<MsBarDatum[]>).data).toHaveLength(2)

    // Uncheck user 2 (Julieta) — only Ana remains in ordered nodes
    mockUseHierarchySelection.mockReturnValue({
      nodes: [makeNode(1, 'MS_SENIOR', true), makeNode(2, 'MS_JUNIOR', false)],
      selectedUserIds: [1],
      toggle: vi.fn(),
      dispatch: vi.fn(),
    })

    rerender()

    await waitFor(() => {
      const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data
      expect(data).toHaveLength(1)
      expect(data[0].userId).toBe(1)
    })

    const lastCallUrl = String(fetchMock.mock.calls.at(-1)?.[0])
    expect(lastCallUrl).toContain('userIds=1')
    expect(lastCallUrl).not.toContain('userIds=1%2C2')
  })

  it('refetches with updated date range when appliedFilters change (AC-10)', async () => {
    const nodes = [makeNode(1, 'MS_SENIOR', true)]
    setupMocks(nodes, [1])

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ userId: 1, currencyType: 1, totalAmount: 100000, count: 1 }],
      }),
    } as Response)
    global.fetch = fetchMock

    const { result, rerender } = renderHook(() => useMsBarChart(4050))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const q1Filters: DashboardAppliedFilters = {
      ...defaultFilters,
      dateRange: {
        start: new Date('2026-01-01'),
        end: new Date('2026-03-31'),
      },
    }

    mockUseDashboardFilter.mockReturnValue({
      draft: q1Filters,
      appliedFilters: q1Filters,
      dispatch: vi.fn(),
      isApplyEnabled: false,
      periodLabel: 'Q1 2026',
      activeBadges: [],
    })

    rerender()

    await waitFor(() => {
      const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0])
      expect(lastUrl).toContain('dateFrom=2026-01-01')
      expect(lastUrl).toContain('dateTo=2026-03-31')
    })
  })

  it('recomputes nationalUsd when trmRate changes without refetching', async () => {
    const nodes = [makeNode(1, 'MS_SENIOR', true)]
    setupMocks(nodes, [1])

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ userId: 1, currencyType: 1, totalAmount: 405000, count: 2 }],
      }),
    } as Response)
    global.fetch = fetchMock

    const { result, rerender } = renderHook(
      ({ trm }: { trm: number | null }) => useMsBarChart(trm),
      { initialProps: { trm: 4050 as number | null } }
    )

    await waitFor(() => expect(result.current.status).toBe('success'))

    const initialCalls = fetchMock.mock.calls.length
    const dataAt4050 = (result.current as AsyncSuccessState<MsBarDatum[]>).data[0]
    expect(dataAt4050.nationalUsd).toBe(100)

    rerender({ trm: 8100 })

    await waitFor(() => {
      const data = (result.current as AsyncSuccessState<MsBarDatum[]>).data[0]
      expect(data.nationalUsd).toBe(50)
    })

    expect(fetchMock.mock.calls.length).toBe(initialCalls)
  })
})
