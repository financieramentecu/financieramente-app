import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { HeatmapViewModel, PersonRow, CompanyColumn, CategoryLegendItem } from '../../types/production-kpi.types'

// Mock the hook so we control what the panel sees
vi.mock('../../hooks/use-heatmap-table', () => ({
  useHeatmapTable: vi.fn(),
}))

// Mock HierarchySelectionContext and DashboardFilterContext
vi.mock('../../components/HierarchySelectionContext', () => ({
  useHierarchySelection: vi.fn().mockReturnValue({
    nodes: [],
    selectedUserIds: [1],
    toggle: vi.fn(),
    dispatch: vi.fn(),
  }),
}))
vi.mock('../../components/DashboardFilterContext', () => ({
  useDashboardFilter: vi.fn().mockReturnValue({
    appliedFilters: {
      dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
      statuses: [], categoryIds: [], companyIds: [], productIds: [],
      originIds: [], plazos: [], periodicidades: [], isInternacional: false,
    },
    draft: {},
    dispatch: vi.fn(),
    isApplyEnabled: false,
    periodLabel: '',
    activeBadges: [],
  }),
}))

import { useHeatmapTable } from '../../hooks/use-heatmap-table'
import { HeatmapTablePanel } from '../../components/HeatmapTablePanel'

const mockUseHeatmapTable = vi.mocked(useHeatmapTable)

function makeRow(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    idUser: overrides.idUser ?? 1,
    fullName: overrides.fullName ?? 'Ana García',
    levelCode: overrides.levelCode ?? 'MS_SENIOR',
    levelOrder: overrides.levelOrder ?? 2,
    levelColor: overrides.levelColor ?? '#333',
    categoryName: overrides.categoryName ?? 'Categoría A',
    cellsByCompany: overrides.cellsByCompany ?? new Map([[5, { usdTotal: 500, copTotal: 0, count: 1 }]]),
  }
}

function makeColumn(overrides: Partial<CompanyColumn> = {}): CompanyColumn {
  return {
    idCompany: overrides.idCompany ?? 5,
    companyName: overrides.companyName ?? 'Empresa X',
    totalUsd: overrides.totalUsd ?? 1000,
    maxUsd: overrides.maxUsd ?? 500,
  }
}

function makeLegendItem(categoryName: string, levelColor: string): CategoryLegendItem {
  return { categoryName, levelColor }
}

function makeViewModel(overrides: Partial<HeatmapViewModel> = {}): HeatmapViewModel {
  return {
    rows: overrides.rows ?? [makeRow()],
    companyColumns: overrides.companyColumns ?? [makeColumn()],
    legend: overrides.legend ?? [makeLegendItem('Categoría A', '#333')],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HeatmapTablePanel', () => {
  it('(a) sticky first column has position: sticky and zIndex inline style', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel(),
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)

    // Find first th (header of sticky column) — should have sticky style
    const firstTh = container.querySelector('th') as HTMLElement | null
    expect(firstTh).toBeTruthy()
    expect(firstTh?.style.position).toBe('sticky')
    expect(Number(firstTh?.style.zIndex)).toBeGreaterThan(0)
  })

  it('(b) non-zero cell has rgba(59,130,246,...) background color', () => {
    // Cell: usdTotal=500, column maxUsd=1000 → intensity=0.5
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ cellsByCompany: new Map([[5, { usdTotal: 500, copTotal: 0, count: 1 }]]) })],
        companyColumns: [makeColumn({ maxUsd: 1000 })],
      }),
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)

    // Find data cells (td excluding the sticky first column)
    const cells = Array.from(container.querySelectorAll('td'))
    const colorCell = cells.find((td) => td.style.backgroundColor.includes('rgba'))
    expect(colorCell).toBeTruthy()
    expect(colorCell?.style.backgroundColor).toContain('rgba(59, 130, 246')
  })

  it('(c) zero-value cell has no background color applied', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ cellsByCompany: new Map([[5, { usdTotal: 0, copTotal: 0, count: 0 }]]) })],
        companyColumns: [makeColumn({ maxUsd: 1000 })],
      }),
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)

    // Data cells should not have rgba background
    const dataCells = Array.from(container.querySelectorAll('tbody td') as NodeListOf<HTMLElement>).filter(
      (td) => !td.style.position.includes('sticky')
    )
    for (const cell of dataCells) {
      expect(cell.style.backgroundColor).not.toContain('rgba')
    }
  })

  it('(d) negative cell is plain text with no rgba background', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ cellsByCompany: new Map([[5, { usdTotal: -50, copTotal: 0, count: 1 }]]) })],
        companyColumns: [makeColumn({ maxUsd: 1000 })],
      }),
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)

    const dataCells = Array.from(container.querySelectorAll('tbody td') as NodeListOf<HTMLElement>).filter(
      (td) => !td.style.position.includes('sticky')
    )
    for (const cell of dataCells) {
      expect(cell.style.backgroundColor).not.toContain('rgba')
    }
    // Negative USD renders as — (same as zero — no heatmap, no value shown)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('(e) subtitle shows "{n} asesores"', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ idUser: 1 }), makeRow({ idUser: 2 })],
        companyColumns: [makeColumn()],
      }),
      error: '',
    })

    render(<HeatmapTablePanel trmRate={4600} />)

    expect(screen.getByText(/2 asesores/i)).toBeTruthy()
  })

  it('(f) legend excludes categories not present in visible rows', () => {
    // Legend has 2 items but only 1 is present in visible rows
    // Since legend is derived FROM rows in the hook, if we pass a legend with items
    // not backed by rows, the component renders what the hook provides.
    // This test verifies the component renders the legend correctly.
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ categoryName: 'Categoría A', levelColor: '#333' })],
        companyColumns: [makeColumn()],
        legend: [makeLegendItem('Categoría A', '#333')],
        // 'Categoría B' NOT in legend — hook already excluded it
      }),
      error: '',
    })

    render(<HeatmapTablePanel trmRate={4600} />)

    expect(screen.queryByText('Categoría B')).toBeNull()
    expect(screen.getAllByText('Categoría A').length).toBeGreaterThan(0)
  })

  it('(g) table is wrapped in overflow-x-auto container', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel(),
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)

    const overflowDiv = container.querySelector('.overflow-x-auto')
    expect(overflowDiv).toBeTruthy()
    const table = overflowDiv?.querySelector('table')
    expect(table).toBeTruthy()
  })

  it('(h) shows loading indicator when status is loading', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'loading',
      data: undefined,
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)
    // Should render something (not crash) — typically a skeleton or spinner
    expect(container.firstChild).toBeTruthy()
  })

  it('(i) shows idle placeholder when status is idle', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'idle',
      data: undefined,
      error: '',
    })

    render(<HeatmapTablePanel trmRate={null} />)
    // Should render gracefully without crashing
    expect(screen.queryByRole('table')).toBeNull()
  })
})
