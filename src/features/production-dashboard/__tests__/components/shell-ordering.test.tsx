/**
 * Shell ordering test: HeatmapTablePanel appears after MsBarChartPanel in document order.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock all hooks used by DashboardShell and its children
vi.mock('../../hooks/use-trm', () => ({
  useTrm: vi.fn().mockReturnValue({
    isLoading: false,
    trmRate: 4600,
    trmState: { status: 'idle' },
    isManual: false,
    error: '',
    setManualTrm: vi.fn(),
  }),
}))

vi.mock('../../hooks/use-ms-bar-chart', () => ({
  useMsBarChart: vi.fn().mockReturnValue({ status: 'idle', data: undefined, error: '' }),
  collectNodesInOrder: vi.fn().mockReturnValue([]),
}))

vi.mock('../../hooks/use-heatmap-table', () => ({
  useHeatmapTable: vi.fn().mockReturnValue({ status: 'idle', data: undefined, error: '' }),
}))

vi.mock('../../hooks/use-origin-donut', () => ({
  useOriginDonut: vi.fn().mockReturnValue({ status: 'idle', data: undefined, error: '' }),
}))

vi.mock('../../hooks/use-production-kpis', () => ({
  useProductionKpis: vi.fn().mockReturnValue({ isLoading: false, computed: null }),
}))

vi.mock('../../hooks/use-hierarchy-tree', () => ({
  useHierarchyTree: vi.fn().mockReturnValue({ state: { status: 'success', data: { nodes: [] }, error: '' } }),
}))

vi.mock('../../hooks/use-dashboard-catalogs', () => ({
  useDashboardCatalogs: vi.fn().mockReturnValue({
    isLoading: false,
    categories: [],
    companies: [],
    products: [],
    origins: [],
    periodicidades: [],
    statusOptions: [],
  }),
}))

vi.mock('next-auth/react', () => ({
  useSession: vi.fn().mockReturnValue({
    data: { user: { id: '1', name: 'Test', email: 'test@test.com' }, expires: '' },
    status: 'authenticated',
    update: vi.fn(),
  }),
}))

// Mock Recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
}))

import { DashboardShell } from '../../components/DashboardShell'

describe('DashboardShell — panel ordering', () => {
  it('HeatmapTablePanel section appears after MsBarChartPanel section in document order', () => {
    const { container } = render(<DashboardShell />)

    const sections = Array.from(container.querySelectorAll('section'))

    // Find section containing MS bar chart heading
    const msChartIdx = sections.findIndex((s) =>
      s.textContent?.includes('Producción por Money Strategist')
    )
    // Find section containing heatmap heading
    const heatmapIdx = sections.findIndex((s) =>
      s.textContent?.includes('Producción por empresa (heatmap)')
    )

    expect(msChartIdx).toBeGreaterThanOrEqual(0)
    expect(heatmapIdx).toBeGreaterThanOrEqual(0)
    expect(heatmapIdx).toBeGreaterThan(msChartIdx)
  })

  it('OriginDonutPanel section appears between UsdKpiPanel and MsBarChartPanel (ADR-D6)', () => {
    const { container } = render(<DashboardShell />)

    const sections = Array.from(container.querySelectorAll('section'))

    const donutIdx = sections.findIndex((s) =>
      s.textContent?.includes('Distribución por origen del cliente')
    )
    const msChartIdx = sections.findIndex((s) =>
      s.textContent?.includes('Producción por Money Strategist')
    )

    expect(donutIdx).toBeGreaterThanOrEqual(0)
    expect(msChartIdx).toBeGreaterThanOrEqual(0)
    expect(donutIdx).toBeLessThan(msChartIdx)
  })
})
