import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OriginDonutChart } from '../../components/OriginDonutChart'
import type { OriginDonutSlice } from '../../types/production-kpi.types'

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
  originId: number,
  originName: string,
  count: number,
  percentage: number
): OriginDonutSlice {
  return {
    originId,
    originName,
    count,
    copCount: 0,
    copTotal: 0,
    foreignUsd: count * 10000,
    percentage,
    fill: '#2563eb',
    fillLight: '#93c5fd',
  }
}

describe('OriginDonutChart', () => {
  it('renders skeleton with aria-busy when status is loading', () => {
    const { container } = render(
      <OriginDonutChart
        chartState={{ status: 'loading', data: undefined, error: '' }}
        trmRate={null}
      />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders skeleton with aria-busy when status is idle', () => {
    const { container } = render(
      <OriginDonutChart
        chartState={{ status: 'idle', data: undefined, error: '' }}
        trmRate={null}
      />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders error card when status is error', () => {
    render(
      <OriginDonutChart
        chartState={{ status: 'error', data: undefined, error: 'fail' }}
        trmRate={null}
      />
    )
    expect(screen.getByText('Error al cargar la distribución por origen')).toBeTruthy()
  })

  it('renders empty state when success with empty data', () => {
    render(
      <OriginDonutChart
        chartState={{ status: 'success', data: [], error: '' }}
        trmRate={null}
      />
    )
    expect(screen.getByText('Sin negocios para los filtros aplicados')).toBeTruthy()
  })

  it('renders chart container when success with data', () => {
    const slices = [
      makeSlice(1, 'Referido', 50, 50),
      makeSlice(2, 'Digital', 50, 50),
    ]

    const { container } = render(
      <OriginDonutChart
        chartState={{ status: 'success', data: slices, error: '' }}
        trmRate={null}
      />
    )
    expect(container.querySelector('[data-testid="responsive-container"]')).toBeTruthy()
  })

  it('renders one Cell per slice when data has N slices', () => {
    const slices = [
      makeSlice(1, 'Referido', 30, 30),
      makeSlice(2, 'Digital', 40, 40),
      makeSlice(3, 'Presencial', 30, 30),
    ]

    const { container } = render(
      <OriginDonutChart
        chartState={{ status: 'success', data: slices, error: '' }}
        trmRate={null}
      />
    )

    const cells = container.querySelectorAll('[data-testid="cell"]')
    expect(cells).toHaveLength(3)
  })

  it('passes fill color from slice to each Cell', () => {
    const slices = [makeSlice(1, 'Referido', 100, 100)]
    slices[0] = { ...slices[0], fill: '#dc2626' }

    const { container } = render(
      <OriginDonutChart
        chartState={{ status: 'success', data: slices, error: '' }}
        trmRate={null}
      />
    )

    const cell = container.querySelector('[data-testid="cell"]')
    expect(cell?.getAttribute('data-fill')).toBe('#dc2626')
  })
})
