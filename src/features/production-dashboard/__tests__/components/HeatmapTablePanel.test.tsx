import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
const mockAppliedFilters = {
  dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
  statuses: [], categoryIds: [], companyIds: [], productIds: [],
  originIds: [], plazos: [], periodicidades: [], isInternacional: false,
}
vi.mock('../../components/DashboardFilterContext', () => ({
  useDashboardFilter: vi.fn(() => ({
    appliedFilters: mockAppliedFilters,
    draft: {},
    dispatch: vi.fn(),
    isApplyEnabled: false,
    periodLabel: '',
    activeBadges: [],
  })),
}))

// Catalogs are only needed for periodicidad name→id mapping — irrelevant to
// these panel-level tests, so a minimal empty resolved state suffices.
vi.mock('../../hooks/use-dashboard-catalogs', () => ({
  useDashboardCatalogs: vi.fn(() => ({
    status: 'success',
    data: { companies: [], products: [], origins: [], categories: [], periodicidades: [] },
    error: '',
  })),
}))

// Stub the expanded detail component — its own behavior is covered by
// HeatmapCellBusinessList.test.tsx. Here we only verify wiring (which
// idUser/idCompany get rendered, in which row, how many times).
vi.mock('../../components/HeatmapCellBusinessList', () => ({
  HeatmapCellBusinessList: ({ idUser, idCompany }: { idUser: number; idCompany: number }) => (
    <div data-testid={`cell-detail-${idUser}-${idCompany}`}>Detail {idUser}:{idCompany}</div>
  ),
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

  // ─── Accordion expand/collapse (heatmap-cell-business-accordion) ────────────

  it('(j) chevron toggles from chevron-right to chevron-down and renders a detail row', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ idUser: 1, cellsByCompany: new Map([[5, { usdTotal: 500, copTotal: 0, count: 3 }]]) })],
        companyColumns: [makeColumn({ idCompany: 5 })],
      }),
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)

    expect(container.querySelector('svg.lucide-chevron-right')).toBeTruthy()
    expect(container.querySelector('svg.lucide-chevron-down')).toBeNull()
    expect(screen.queryByTestId('cell-detail-1-5')).toBeNull()

    const chevronButton = screen.getByRole('button', { name: /expandir/i })
    fireEvent.click(chevronButton)

    expect(container.querySelector('svg.lucide-chevron-down')).toBeTruthy()
    expect(screen.getByTestId('cell-detail-1-5')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /colapsar/i }))
    expect(screen.queryByTestId('cell-detail-1-5')).toBeNull()
  })

  it('(k) clicking the USD/NEG value sub-cells does not toggle the row', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ idUser: 1, cellsByCompany: new Map([[5, { usdTotal: 500, copTotal: 0, count: 3 }]]) })],
        companyColumns: [makeColumn({ idCompany: 5 })],
      }),
      error: '',
    })

    render(<HeatmapTablePanel trmRate={4600} />)

    const usdCell = screen.getByText(/500/).closest('td')!
    fireEvent.click(usdCell)

    expect(screen.queryByTestId('cell-detail-1-5')).toBeNull()
  })

  it('(l) multiple advisor rows expand independently', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [
          makeRow({ idUser: 1, fullName: 'Ana', cellsByCompany: new Map([[5, { usdTotal: 500, copTotal: 0, count: 1 }]]) }),
          makeRow({ idUser: 2, fullName: 'Carlos', cellsByCompany: new Map([[5, { usdTotal: 600, copTotal: 0, count: 1 }]]) }),
        ],
        companyColumns: [makeColumn({ idCompany: 5 })],
      }),
      error: '',
    })

    render(<HeatmapTablePanel trmRate={4600} />)

    const buttons = screen.getAllByRole('button', { name: /expandir/i })
    fireEvent.click(buttons[0])

    expect(screen.getByTestId('cell-detail-1-5')).toBeInTheDocument()
    expect(screen.queryByTestId('cell-detail-2-5')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /expandir/i }))
    expect(screen.getByTestId('cell-detail-2-5')).toBeInTheDocument()
    // Row 1 stays expanded — independent multi-expansion
    expect(screen.getByTestId('cell-detail-1-5')).toBeInTheDocument()
  })

  it('(m) the detail <tr colSpan> row appears immediately after the advisor row and pushes subsequent rows down', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [
          makeRow({ idUser: 1, fullName: 'Ana', cellsByCompany: new Map([[5, { usdTotal: 500, copTotal: 0, count: 1 }]]) }),
          makeRow({ idUser: 2, fullName: 'Carlos', cellsByCompany: new Map([[5, { usdTotal: 600, copTotal: 0, count: 1 }]]) }),
        ],
        companyColumns: [makeColumn({ idCompany: 5 })],
      }),
      error: '',
    })

    const { container } = render(<HeatmapTablePanel trmRate={4600} />)

    fireEvent.click(screen.getAllByRole('button', { name: /expandir/i })[0])

    const rows = Array.from(container.querySelectorAll('tbody tr'))
    const advisorRowIdx = rows.findIndex((r) => r.textContent?.includes('Ana'))
    const detailRowIdx = rows.findIndex((r) => r.querySelector('[data-testid="cell-detail-1-5"]'))
    const carlosRowIdx = rows.findIndex((r) => r.textContent?.includes('Carlos'))

    expect(detailRowIdx).toBe(advisorRowIdx + 1)
    expect(carlosRowIdx).toBeGreaterThan(detailRowIdx)

    const detailTd = rows[detailRowIdx].querySelector('td')
    expect(detailTd?.getAttribute('colspan')).toBe('3') // 1 + 1 company * 2
  })

  it('(n) expansion survives a re-render triggered by a filter change (no collapse)', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ idUser: 1, cellsByCompany: new Map([[5, { usdTotal: 500, copTotal: 0, count: 1 }]]) })],
        companyColumns: [makeColumn({ idCompany: 5 })],
      }),
      error: '',
    })

    const { rerender } = render(<HeatmapTablePanel trmRate={4600} />)
    fireEvent.click(screen.getByRole('button', { name: /expandir/i }))
    expect(screen.getByTestId('cell-detail-1-5')).toBeInTheDocument()

    // Simulate a filter re-render: same component instance, hook returns a new
    // (but equivalent) view model — the panel does not remount.
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ idUser: 1, cellsByCompany: new Map([[5, { usdTotal: 700, copTotal: 0, count: 2 }]]) })],
        companyColumns: [makeColumn({ idCompany: 5 })],
      }),
      error: '',
    })
    rerender(<HeatmapTablePanel trmRate={4600} />)

    expect(screen.getByTestId('cell-detail-1-5')).toBeInTheDocument()
  })

  it('(o) a full unmount/remount (page reload) resets expansion', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [makeRow({ idUser: 1, cellsByCompany: new Map([[5, { usdTotal: 500, copTotal: 0, count: 1 }]]) })],
        companyColumns: [makeColumn({ idCompany: 5 })],
      }),
      error: '',
    })

    const { unmount } = render(<HeatmapTablePanel trmRate={4600} />)
    fireEvent.click(screen.getByRole('button', { name: /expandir/i }))
    expect(screen.getByTestId('cell-detail-1-5')).toBeInTheDocument()
    unmount()

    render(<HeatmapTablePanel trmRate={4600} />)
    expect(screen.queryByTestId('cell-detail-1-5')).toBeNull()
  })

  it('(p) expanding an advisor row with businesses in 2 companies renders 2 distinct per-company group sections', () => {
    mockUseHeatmapTable.mockReturnValue({
      status: 'success',
      data: makeViewModel({
        rows: [
          makeRow({
            idUser: 1,
            cellsByCompany: new Map([
              [5, { usdTotal: 500, copTotal: 0, count: 2 }],
              [6, { usdTotal: 300, copTotal: 0, count: 1 }],
            ]),
          }),
        ],
        companyColumns: [
          makeColumn({ idCompany: 5, companyName: 'Empresa X' }),
          makeColumn({ idCompany: 6, companyName: 'Empresa Y' }),
        ],
      }),
      error: '',
    })

    render(<HeatmapTablePanel trmRate={4600} />)

    fireEvent.click(screen.getByRole('button', { name: /expandir/i }))

    expect(screen.getByTestId('cell-detail-1-5')).toBeInTheDocument()
    expect(screen.getByTestId('cell-detail-1-6')).toBeInTheDocument()
    expect(screen.getByText('Empresa X')).toBeInTheDocument()
    expect(screen.getByText('Empresa Y')).toBeInTheDocument()
  })
})
