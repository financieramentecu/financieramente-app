import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusDonutTooltip } from '../../components/StatusDonutTooltip'
import type { StatusDonutSlice } from '../../types/production-kpi.types'

function makeSlice(overrides: Partial<StatusDonutSlice> = {}): StatusDonutSlice {
  return {
    status: 'EMITIDO',
    label: 'Emitido',
    count: 63,
    copCount: 0,
    percentage: 45,
    fill: '#3b82f6',
    totalUSD: 0,
    copTotal: 0,
    foreignUsd: 0,
    ...overrides,
  }
}

describe('StatusDonutTooltip', () => {
  it('renders nothing when active is false', () => {
    const { container } = render(
      <StatusDonutTooltip active={false} payload={[{ payload: makeSlice() }]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when payload is empty', () => {
    const { container } = render(<StatusDonutTooltip active={true} payload={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when active is undefined', () => {
    const { container } = render(
      <StatusDonutTooltip payload={[{ payload: makeSlice() }]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows count and percentage in format "COUNT negocios (PCT%)"', () => {
    render(
      <StatusDonutTooltip active={true} payload={[{ payload: makeSlice({ count: 63, percentage: 45 }) }]} />
    )
    expect(screen.getByText('63 negocios (45%)')).toBeInTheDocument()
  })

  it('shows the status label', () => {
    render(
      <StatusDonutTooltip active={true} payload={[{ payload: makeSlice({ label: 'Emitido' }) }]} />
    )
    expect(screen.getByText('Emitido')).toBeInTheDocument()
  })

  it('handles sub-1% percentage correctly', () => {
    render(
      <StatusDonutTooltip
        active={true}
        payload={[{ payload: makeSlice({ count: 1, percentage: 0.3, label: 'Fondeado' }) }]}
      />
    )
    expect(screen.getByText('1 negocio (0.3%)')).toBeInTheDocument()
  })

  it('handles 100% single-status case', () => {
    render(
      <StatusDonutTooltip
        active={true}
        payload={[{ payload: makeSlice({ count: 50, percentage: 100, label: 'Venta Efectuada' }) }]}
      />
    )
    expect(screen.getByText('50 negocios (100%)')).toBeInTheDocument()
  })

  it('shows USD amount when trmRate is provided and foreignUsd > 0', () => {
    render(
      <StatusDonutTooltip
        active={true}
        payload={[{ payload: makeSlice({ foreignUsd: 125000 }) }]}
        trmRate={4200}
      />
    )
    expect(screen.getByText('$125,000')).toBeInTheDocument()
  })

  it('does not show USD line when trmRate is null and no foreignUsd', () => {
    render(
      <StatusDonutTooltip
        active={true}
        payload={[{ payload: makeSlice({ foreignUsd: 0, copTotal: 0 }) }]}
        trmRate={null}
      />
    )
    expect(screen.queryByText(/\$/)).toBeNull()
  })
})
