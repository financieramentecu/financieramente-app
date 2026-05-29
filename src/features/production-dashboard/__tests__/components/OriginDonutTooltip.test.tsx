import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OriginDonutTooltip } from '../../components/OriginDonutTooltip'
import type { OriginDonutSlice } from '../../types/production-kpi.types'

function makeSlice(overrides: Partial<OriginDonutSlice> = {}): OriginDonutSlice {
  return {
    originId: 1,
    originName: 'Método Vortex',
    count: 17,
    copCount: 5,
    copTotal: 50000000,
    foreignUsd: 150000,
    percentage: 12.2,
    fill: '#2563eb',
    fillLight: '#93c5fd',
    ...overrides,
  }
}

// Mixed slice used for generic rendering tests (copCount:5 of 17 are COP, rest USD)
const mixedPayload = [{ payload: makeSlice() }]
// Pure USD slice (no COP businesses)
const usdPayload = [{ payload: makeSlice({ copCount: 0, copTotal: 0, foreignUsd: 150000 }) }]
// Pure COP slice (no USD businesses)
const copPayload = [
  {
    payload: makeSlice({
      copCount: 17,
      copTotal: 280000000,
      foreignUsd: 0,
    }),
  },
]

describe('OriginDonutTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<OriginDonutTooltip active={false} payload={usdPayload} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when payload is empty', () => {
    const { container } = render(<OriginDonutTooltip active payload={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders origin name in header', () => {
    render(<OriginDonutTooltip active payload={mixedPayload} />)
    expect(screen.getByText('Método Vortex')).toBeInTheDocument()
  })

  it('renders count and percentage', () => {
    render(<OriginDonutTooltip active payload={mixedPayload} />)
    expect(screen.getByText(/17 negocios \(12\.2%\)/)).toBeInTheDocument()
  })

  it('uses singular "negocio" when count is 1', () => {
    const payload = [{ payload: makeSlice({ count: 1, copCount: 1, foreignUsd: 0 }) }]
    render(<OriginDonutTooltip active payload={payload} />)
    expect(screen.getByText(/1 negocio/)).toBeInTheDocument()
  })

  describe('USD-only segment (no COP)', () => {
    it('shows total USD when foreignUsd > 0 and trmRate is provided', () => {
      render(<OriginDonutTooltip active payload={usdPayload} trmRate={4000} />)
      expect(screen.getAllByText('$150,000').length).toBeGreaterThan(0)
    })

    it('does NOT show COP breakdown line for USD-only segments', () => {
      render(<OriginDonutTooltip active payload={usdPayload} trmRate={4000} />)
      expect(screen.queryByText(/Moneda local/)).toBeNull()
    })

    it('shows USD value even without trmRate when foreignUsd > 0', () => {
      render(<OriginDonutTooltip active payload={usdPayload} />)
      expect(screen.getByText('$150,000')).toBeInTheDocument()
    })
  })

  describe('COP-only segment', () => {
    it('shows USD equivalent (copTotal ÷ trmRate) when trmRate is available', () => {
      render(<OriginDonutTooltip active payload={copPayload} trmRate={4000} />)
      // 280,000,000 / 4000 = 70,000
      expect(screen.getByText('$70,000')).toBeInTheDocument()
    })

    it('shows COP breakdown line when trmRate is available', () => {
      render(<OriginDonutTooltip active payload={copPayload} trmRate={4000} />)
      expect(screen.getByText(/Moneda local/)).toBeInTheDocument()
      expect(screen.getByText(/280\.000\.000 COP/)).toBeInTheDocument()
    })

    it('hides USD line when trmRate is not available', () => {
      render(<OriginDonutTooltip active payload={copPayload} />)
      expect(screen.queryByText(/\$/)).toBeNull()
    })

    it('hides COP breakdown line when trmRate is not available', () => {
      render(<OriginDonutTooltip active payload={copPayload} />)
      expect(screen.queryByText(/Moneda local/)).toBeNull()
    })
  })
})
