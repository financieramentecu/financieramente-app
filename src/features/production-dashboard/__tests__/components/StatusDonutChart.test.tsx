import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusDonutChart } from '../../components/StatusDonutChart'
import type { StatusDonutSlice } from '../../types/production-kpi.types'

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
}))

beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})

function makeSlice(
  status: StatusDonutSlice['status'],
  label: string,
  count: number,
  percentage: number,
  fill: string
): StatusDonutSlice {
  return { status, label, count, copCount: 0, percentage, fill, totalUSD: 0, copTotal: 0, foreignUsd: 0 }
}

describe('StatusDonutChart', () => {
  it('renders skeleton with aria-busy when status is loading', () => {
    const { container } = render(
      <StatusDonutChart chartState={{ status: 'loading', data: undefined, error: '' }} trmRate={null} />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders skeleton with aria-busy when status is idle', () => {
    const { container } = render(
      <StatusDonutChart chartState={{ status: 'idle', data: undefined, error: '' }} trmRate={null} />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders error message when status is error', () => {
    render(
      <StatusDonutChart chartState={{ status: 'error', data: undefined, error: 'fail' }} trmRate={null} />
    )
    expect(screen.getByText('Error al cargar la distribución por estado')).toBeTruthy()
  })

  it('renders empty state text when success with empty data', () => {
    render(<StatusDonutChart chartState={{ status: 'success', data: [], error: '' }} trmRate={null} />)
    expect(screen.getByText('Sin negocios para los filtros aplicados')).toBeTruthy()
  })

  it('renders chart container when success with data', () => {
    const slices = [
      makeSlice('VENTA_EFECTUADA', 'Venta Efectuada', 35, 35, '#f97316'),
      makeSlice('EMITIDO', 'Emitido', 45, 45, '#3b82f6'),
    ]
    const { container } = render(
      <StatusDonutChart chartState={{ status: 'success', data: slices, error: '' }} trmRate={null} />
    )
    expect(container.querySelector('[data-testid="responsive-container"]')).toBeTruthy()
  })

  it('renders one Cell per slice', () => {
    const slices = [
      makeSlice('VENTA_EFECTUADA', 'Venta Efectuada', 35, 35, '#f97316'),
      makeSlice('EMITIDO', 'Emitido', 45, 45, '#3b82f6'),
      makeSlice('FONDEADO', 'Fondeado', 20, 20, '#22c55e'),
    ]
    const { container } = render(
      <StatusDonutChart chartState={{ status: 'success', data: slices, error: '' }} trmRate={null} />
    )
    const cells = container.querySelectorAll('[data-testid="cell"]')
    expect(cells).toHaveLength(3)
  })

  it('passes fill color from slice to each Cell', () => {
    const slices = [makeSlice('EMITIDO', 'Emitido', 100, 100, '#3b82f6')]
    const { container } = render(
      <StatusDonutChart chartState={{ status: 'success', data: slices, error: '' }} trmRate={null} />
    )
    const cell = container.querySelector('[data-testid="cell"]')
    expect(cell?.getAttribute('data-fill')).toBe('#3b82f6')
  })
})
