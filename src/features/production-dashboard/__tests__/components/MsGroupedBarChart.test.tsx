import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MsGroupedBarChart } from '../../components/MsGroupedBarChart'
import type { MsBarDatum } from '../../types/production-kpi.types'

// Recharts uses ResizeObserver internally — mock it for jsdom
beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})

const sampleBarDatum: MsBarDatum = {
  userId: 1,
  fullName: 'Ana García',
  levelCode: 'MS_SENIOR',
  foreignUsd: 10000,
  nationalUsd: 2000,
  nationalUsdDisplay: 2000,
  totalCop: 8100000,
  foreignCount: 3,
  nationalCount: 2,
}

describe('MsGroupedBarChart', () => {
  it('renders skeleton with aria-busy when status is loading', () => {
    const { container } = render(
      <MsGroupedBarChart
        chartState={{ status: 'loading', data: undefined, error: '' }}
        trmRate={4050}
      />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders skeleton with aria-busy when status is idle', () => {
    const { container } = render(
      <MsGroupedBarChart
        chartState={{ status: 'idle', data: undefined, error: '' }}
        trmRate={4050}
      />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('renders empty state message when success with empty data', () => {
    render(
      <MsGroupedBarChart
        chartState={{ status: 'success', data: [], error: '' }}
        trmRate={4050}
      />
    )
    expect(
      screen.getByText('Sin producción registrada para los filtros aplicados')
    ).toBeTruthy()
  })

  it('renders error message when status is error', () => {
    render(
      <MsGroupedBarChart
        chartState={{ status: 'error', data: undefined, error: 'fail' }}
        trmRate={4050}
      />
    )
    expect(screen.getByText('Error al cargar la producción por MS')).toBeTruthy()
  })

  it('renders chart wrapper with correct aria-label when success with data', () => {
    render(
      <MsGroupedBarChart
        chartState={{ status: 'success', data: [sampleBarDatum], error: '' }}
        trmRate={4050}
      />
    )
    expect(
      screen.getByRole('img', {
        name: 'Producción por MS: moneda extranjera vs nacional convertida',
      })
    ).toBeTruthy()
  })

  it('uses horizontal scroll container when chart has data (AC-5)', () => {
    const { container } = render(
      <MsGroupedBarChart
        chartState={{ status: 'success', data: [sampleBarDatum], error: '' }}
        trmRate={4050}
      />
    )
    const scrollWrapper = container.querySelector('.overflow-x-auto')
    expect(scrollWrapper).toBeTruthy()
  })
})
