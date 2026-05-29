import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusDonutLegend } from '../../components/StatusDonutLegend'
import type { StatusDonutSlice } from '../../types/production-kpi.types'

function makeSlice(
  status: StatusDonutSlice['status'],
  label: string,
  percentage: number
): StatusDonutSlice {
  return {
    status,
    label,
    count: 10,
    copCount: 0,
    percentage,
    fill: '#000',
    totalUSD: 0,
    copTotal: 0,
    foreignUsd: 0,
  }
}

describe('StatusDonutLegend', () => {
  it('renders nothing when slices is empty', () => {
    const { container } = render(<StatusDonutLegend slices={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one legend item per slice with "LABEL · PCT%" format', () => {
    const slices = [
      makeSlice('VENTA_EFECTUADA', 'Venta Efectuada', 35),
      makeSlice('EMITIDO', 'Emitido', 45),
      makeSlice('FONDEADO', 'Fondeado', 20),
    ]
    render(<StatusDonutLegend slices={slices} />)
    expect(screen.getByText('Venta Efectuada')).toBeInTheDocument()
    expect(screen.getByText('Emitido')).toBeInTheDocument()
    expect(screen.getByText('Fondeado')).toBeInTheDocument()
    // Percentages are shown
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('renders a color swatch for each slice', () => {
    const slices = [
      { ...makeSlice('EMITIDO', 'Emitido', 100), fill: '#3b82f6' },
    ]
    render(<StatusDonutLegend slices={slices} />)
    const swatches = document.querySelectorAll('[aria-hidden="true"]')
    expect(swatches).toHaveLength(1)
  })

  it('shows sub-1% percentage as decimal', () => {
    const slices = [
      makeSlice('VENTA_EFECTUADA', 'Venta Efectuada', 0.3),
    ]
    render(<StatusDonutLegend slices={slices} />)
    expect(screen.getByText('0.3%')).toBeInTheDocument()
  })

  it('renders 100% for a single-status result', () => {
    const slices = [makeSlice('FONDEADO', 'Fondeado', 100)]
    render(<StatusDonutLegend slices={slices} />)
    expect(screen.getByText('Fondeado')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
