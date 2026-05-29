import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OriginDonutTooltip } from '../../components/OriginDonutTooltip'
import type { OriginDonutSlice } from '../../types/production-kpi.types'

function makeSlice(overrides: Partial<OriginDonutSlice> = {}): OriginDonutSlice {
  return {
    originId: 1,
    originName: 'Método Vortex',
    currencyId: 2,
    currencyName: 'Dólar',
    currencySymbol: 'USD',
    count: 17,
    totalValue: 150000,
    percentage: 12.2,
    fill: '#2563eb',
    fillLight: '#93c5fd',
    ...overrides,
  }
}

const usdPayload = [{ payload: makeSlice() }]
const copPayload = [{ payload: makeSlice({ currencyId: 1, currencyName: 'Peso colombiano', currencySymbol: 'COP', totalValue: 280000000 }) }]

describe('OriginDonutTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<OriginDonutTooltip active={false} payload={usdPayload} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when payload is empty', () => {
    const { container } = render(<OriginDonutTooltip active payload={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders origin name and currency symbol in header', () => {
    render(<OriginDonutTooltip active payload={usdPayload} />)
    expect(screen.getByText('Método Vortex · USD')).toBeInTheDocument()
  })

  it('renders count and percentage', () => {
    render(<OriginDonutTooltip active payload={usdPayload} />)
    expect(screen.getByText(/17 negocios \(12\.2%\)/)).toBeInTheDocument()
  })

  it('uses singular "negocio" when count is 1', () => {
    const payload = [{ payload: makeSlice({ count: 1 }) }]
    render(<OriginDonutTooltip active payload={payload} />)
    expect(screen.getByText(/1 negocio/)).toBeInTheDocument()
  })

  describe('USD segment', () => {
    it('shows USD value directly', () => {
      render(<OriginDonutTooltip active payload={usdPayload} trmRate={4000} />)
      expect(screen.getByText(/150\.000.*USD/)).toBeInTheDocument()
    })

    it('does NOT show COP line for USD segments', () => {
      render(<OriginDonutTooltip active payload={usdPayload} trmRate={4000} />)
      expect(screen.queryByText(/COP/)).toBeNull()
    })

    it('shows USD value even without trmRate', () => {
      render(<OriginDonutTooltip active payload={usdPayload} />)
      expect(screen.getByText(/150\.000.*USD/)).toBeInTheDocument()
    })
  })

  describe('COP segment', () => {
    it('shows USD equivalent (totalValue ÷ trmRate) when trmRate is available', () => {
      render(<OriginDonutTooltip active payload={copPayload} trmRate={4000} />)
      // 280.000.000 / 4000 = 70.000
      expect(screen.getByText(/70\.000.*USD/)).toBeInTheDocument()
    })

    it('shows original COP value as reference line', () => {
      render(<OriginDonutTooltip active payload={copPayload} trmRate={4000} />)
      expect(screen.getByText(/280\.000\.000 COP/)).toBeInTheDocument()
    })

    it('hides USD line when trmRate is not available', () => {
      render(<OriginDonutTooltip active payload={copPayload} />)
      expect(screen.queryByText(/USD/)).toBeNull()
    })

    it('still shows COP reference when trmRate is not available', () => {
      render(<OriginDonutTooltip active payload={copPayload} />)
      expect(screen.getByText(/280\.000\.000 COP/)).toBeInTheDocument()
    })
  })
})
