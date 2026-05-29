import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the hook to avoid context/auth dependencies
vi.mock('../../hooks/use-status-donut', () => ({
  useStatusDonut: vi.fn(),
}))

// Mock the chart component to keep this test focused on the panel's behavior
vi.mock('../../components/StatusDonutChart', () => ({
  StatusDonutChart: ({ chartState }: { chartState: { status: string } }) => (
    <div data-testid="status-donut-chart" data-status={chartState.status} />
  ),
}))

import { useStatusDonut } from '../../hooks/use-status-donut'
import { StatusDonutPanel } from '../../components/StatusDonutPanel'

const mockUseStatusDonut = vi.mocked(useStatusDonut)

describe('StatusDonutPanel', () => {
  it('renders the panel heading', () => {
    mockUseStatusDonut.mockReturnValue({ status: 'idle', data: undefined, error: '' })
    render(<StatusDonutPanel trmRate={null} />)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('passes chartState from hook to StatusDonutChart', () => {
    mockUseStatusDonut.mockReturnValue({ status: 'loading', data: undefined, error: '' })
    render(<StatusDonutPanel trmRate={null} />)
    const chart = screen.getByTestId('status-donut-chart')
    expect(chart.getAttribute('data-status')).toBe('loading')
  })

  it('passes success chartState to StatusDonutChart', () => {
    const slices = [
      { status: 'VENTA_EFECTUADA' as const, label: 'Venta Efectuada', count: 35, copCount: 0, percentage: 35, fill: '#f97316', totalUSD: 0, copTotal: 0, foreignUsd: 0 },
    ]
    mockUseStatusDonut.mockReturnValue({ status: 'success', data: slices, error: '' })
    render(<StatusDonutPanel trmRate={null} />)
    const chart = screen.getByTestId('status-donut-chart')
    expect(chart.getAttribute('data-status')).toBe('success')
  })
})
