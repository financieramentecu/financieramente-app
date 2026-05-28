import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanyDonutChart } from '../../components/CompanyDonutChart'
import type { CompanyDonutSlice } from '../../types/production-kpi.types'

// Mock Recharts — jsdom does not implement SVG layout
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})

function makeSlice(
  companyId: number,
  companyName: string,
  count: number,
  percentage: number
): CompanyDonutSlice {
  return {
    companyId,
    companyName,
    currencyId: 2,
    currencyName: 'Dólar',
    currencySymbol: 'USD',
    count,
    totalValue: count * 10000,
    percentage,
    fill: '#0d9488',
    fillLight: '#99f6e4',
  }
}

describe('CompanyDonutChart', () => {
  it('renders skeleton with aria-busy when status is loading', () => {
    const { container } = render(
      <CompanyDonutChart
        chartState={{ status: 'loading', data: undefined, error: '' }}
        trmRate={4000}
      />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders skeleton with aria-busy when status is idle', () => {
    const { container } = render(
      <CompanyDonutChart
        chartState={{ status: 'idle', data: undefined, error: '' }}
        trmRate={null}
      />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders error card when status is error', () => {
    render(
      <CompanyDonutChart
        chartState={{ status: 'error', data: undefined, error: 'fail' }}
        trmRate={null}
      />
    )
    expect(screen.getByText('Error al cargar la distribución por compañía')).toBeTruthy()
  })

  it('renders empty state when success with empty data', () => {
    render(
      <CompanyDonutChart
        chartState={{ status: 'success', data: [], error: '' }}
        trmRate={null}
      />
    )
    expect(screen.getByText('Sin negocios para los filtros aplicados')).toBeTruthy()
  })

  it('renders chart container when success with data', () => {
    const slices = [
      makeSlice(1, 'SKANDIA', 50, 50),
      makeSlice(2, 'TRINITY', 50, 50),
    ]

    const { container } = render(
      <CompanyDonutChart
        chartState={{ status: 'success', data: slices, error: '' }}
        trmRate={4200}
      />
    )
    expect(container.querySelector('[data-testid="responsive-container"]')).toBeTruthy()
  })

  it('renders one Cell per slice when data has N slices', () => {
    const slices = [
      makeSlice(1, 'SKANDIA', 30, 30),
      makeSlice(2, 'TRINITY', 40, 40),
      makeSlice(3, 'LIBERTY', 30, 30),
    ]

    const { container } = render(
      <CompanyDonutChart
        chartState={{ status: 'success', data: slices, error: '' }}
        trmRate={4200}
      />
    )

    const cells = container.querySelectorAll('[data-testid="cell"]')
    expect(cells).toHaveLength(3)
  })

  it('passes fill color from slice to each Cell', () => {
    const slices = [makeSlice(1, 'SKANDIA', 100, 100)]
    slices[0] = { ...slices[0], fill: '#4f46e5' }

    const { container } = render(
      <CompanyDonutChart
        chartState={{ status: 'success', data: slices, error: '' }}
        trmRate={4200}
      />
    )

    const cell = container.querySelector('[data-testid="cell"]')
    expect(cell?.getAttribute('data-fill')).toBe('#4f46e5')
  })
})
