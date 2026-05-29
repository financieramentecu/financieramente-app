import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock context hooks before importing the hook under test
vi.mock('../../components/HierarchySelectionContext', () => ({
  useHierarchySelection: vi.fn(),
}))
vi.mock('../../components/DashboardFilterContext', () => ({
  useDashboardFilter: vi.fn(),
}))

import { useHierarchySelection } from '../../components/HierarchySelectionContext'
import { useDashboardFilter } from '../../components/DashboardFilterContext'
import { useHeatmapTable } from '../../hooks/use-heatmap-table'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'
import type { AsyncSuccessState } from '@/features/shared/types/async-state.types'
import type { HeatmapViewModel } from '../../types/production-kpi.types'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)
const mockUseDashboardFilter = vi.mocked(useDashboardFilter)

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

function setupMocks(selectedUserIds: readonly number[] = [1]) {
  mockUseHierarchySelection.mockReturnValue({
    nodes: [],
    selectedUserIds,
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
}

// Sample HeatmapRaw[] response from API
function makeHeatmapRawResponse() {
  return [
    {
      idUser: 1,
      fullName: 'Ana García',
      levelCode: 'MS_SENIOR',
      levelOrder: 2,
      levelColor: '#333',
      categoryName: 'Categoría A',
      idCategory: 10,
      cells: [
        { idCompany: 5, companyName: 'Empresa X', copTotal: 4600000, foreignUsdTotal: 0, count: 2 },
        { idCompany: 6, companyName: 'Empresa Y', copTotal: 2300000, foreignUsdTotal: 0, count: 1 },
      ],
    },
    {
      idUser: 2,
      fullName: 'Carlos López',
      levelCode: 'MS_JUNIOR',
      levelOrder: 1,
      levelColor: '#444',
      categoryName: 'Categoría B',
      idCategory: 11,
      cells: [
        { idCompany: 5, companyName: 'Empresa X', copTotal: 9200000, foreignUsdTotal: 0, count: 4 },
      ],
    },
    {
      idUser: 3,
      fullName: 'Beatriz Torres',
      levelCode: 'TEAM_LEADER',
      levelOrder: 3,
      levelColor: '#222',
      categoryName: 'Categoría A',
      idCategory: 10,
      cells: [
        { idCompany: 5, companyName: 'Empresa X', copTotal: 1150000, foreignUsdTotal: 0, count: 1 },
      ],
    },
  ]
}

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('useHeatmapTable', () => {
  it('(a) status === idle when trmRate is null', () => {
    setupMocks([1])
    const { result } = renderHook(() => useHeatmapTable(null))
    expect(result.current.status).toBe('idle')
  })

  it('(b) no fetch is triggered when trmRate is null', async () => {
    setupMocks([1])
    const fetchMock = vi.fn()
    global.fetch = fetchMock

    renderHook(() => useHeatmapTable(null))

    // Wait a tick to ensure no async calls were made
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('(c) rows sorted by levelOrder desc then fullName asc', async () => {
    setupMocks([1, 2, 3])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: makeHeatmapRawResponse() }),
    } as Response)

    const { result } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<HeatmapViewModel>).data
    // TL (levelOrder=3) first, then MS_SENIOR (2), then MS_JUNIOR (1)
    expect(data.rows[0].levelOrder).toBe(3)  // Beatriz (TL)
    expect(data.rows[1].levelOrder).toBe(2)  // Ana (MS_SENIOR)
    expect(data.rows[2].levelOrder).toBe(1)  // Carlos (MS_JUNIOR)
  })

  it('(d) companies sorted by total USD desc', async () => {
    setupMocks([1, 2, 3])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: makeHeatmapRawResponse() }),
    } as Response)

    const { result } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<HeatmapViewModel>).data
    // Empresa X: sum = (4600000+9200000+1150000)/4600 = 3250 USD
    // Empresa Y: sum = 2300000/4600 = 500 USD
    expect(data.companyColumns[0].companyName).toBe('Empresa X')
    expect(data.companyColumns[1].companyName).toBe('Empresa Y')
  })

  it('(e) all-zero-USD company column excluded', async () => {
    setupMocks([1])
    // Company 7 has zero copTotal for this user
    const rawWithZeroCompany = [
      {
        idUser: 1,
        fullName: 'Ana García',
        levelCode: 'MS_SENIOR',
        levelOrder: 2,
        levelColor: '#333',
        categoryName: 'Cat A',
        idCategory: 10,
        cells: [
          { idCompany: 5, companyName: 'Empresa X', copTotal: 4600000, foreignUsdTotal: 0, count: 1 },
          { idCompany: 7, companyName: 'Empresa Z', copTotal: 0, foreignUsdTotal: 0, count: 0 },
        ],
      },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: rawWithZeroCompany }),
    } as Response)

    const { result } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<HeatmapViewModel>).data
    // Empresa Z should be excluded (all-zero)
    expect(data.companyColumns.some((c) => c.companyName === 'Empresa Z')).toBe(false)
    expect(data.companyColumns.some((c) => c.companyName === 'Empresa X')).toBe(true)
  })

  it('(f) COP-to-USD conversion uses trmRate', async () => {
    setupMocks([1])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            idUser: 1,
            fullName: 'Ana García',
            levelCode: 'MS_SENIOR',
            levelOrder: 2,
            levelColor: '#333',
            categoryName: 'Cat A',
            idCategory: 10,
            cells: [{ idCompany: 5, companyName: 'Empresa X', copTotal: 4600000, foreignUsdTotal: 0, count: 1 }],
          },
        ],
      }),
    } as Response)

    const { result } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<HeatmapViewModel>).data
    // 4600000 / 4600 = 1000 USD
    expect(data.rows[0].cellsByCompany.get(5)?.usdTotal).toBe(1000)
  })

  it('(g) isInternacional absent from fetch URL', async () => {
    setupMocks([1])
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    global.fetch = fetchMock

    const { result } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const calledUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(calledUrl).not.toContain('isInternacional')
  })

  it('(h) re-fetches when appliedFilters changes', async () => {
    setupMocks([1])
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)
    global.fetch = fetchMock

    const { result, rerender } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('success'))
    const initialCalls = fetchMock.mock.calls.length

    const newFilters: DashboardAppliedFilters = {
      ...defaultFilters,
      dateRange: { start: new Date('2026-02-01'), end: new Date('2026-02-28') },
    }
    mockUseDashboardFilter.mockReturnValue({
      draft: newFilters,
      appliedFilters: newFilters,
      dispatch: vi.fn(),
      isApplyEnabled: false,
      periodLabel: 'Feb 2026',
      activeBadges: [],
    })

    rerender()

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls)
    })

    const lastUrl = String(fetchMock.mock.calls.at(-1)?.[0])
    expect(lastUrl).toContain('dateFrom=2026-02-01')
  })

  it('(i) transitions to error state on fetch failure', async () => {
    setupMocks([1])
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeTruthy()
  })

  it('(j) companyColumns maxUsd equals highest individual row usdTotal for that company', async () => {
    setupMocks([1, 2])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            idUser: 1, fullName: 'Ana', levelCode: 'MS_SENIOR', levelOrder: 2,
            levelColor: '#333', categoryName: 'Cat A', idCategory: 10,
            cells: [{ idCompany: 5, companyName: 'Empresa X', copTotal: 4600000, foreignUsdTotal: 0, count: 1 }],
          },
          {
            idUser: 2, fullName: 'Carlos', levelCode: 'MS_JUNIOR', levelOrder: 1,
            levelColor: '#444', categoryName: 'Cat B', idCategory: 11,
            cells: [{ idCompany: 5, companyName: 'Empresa X', copTotal: 9200000, foreignUsdTotal: 0, count: 1 }],
          },
        ],
      }),
    } as Response)

    const { result } = renderHook(() => useHeatmapTable(4600))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const data = (result.current as AsyncSuccessState<HeatmapViewModel>).data
    const empresaX = data.companyColumns.find((c) => c.companyName === 'Empresa X')
    // Ana: 4600000/4600 = 1000 USD; Carlos: 9200000/4600 = 2000 USD
    // totalUsd = 3000; maxUsd = 2000 (Carlos's row is the max)
    expect(empresaX?.totalUsd).toBe(3000)
    expect(empresaX?.maxUsd).toBe(2000)
  })
})
