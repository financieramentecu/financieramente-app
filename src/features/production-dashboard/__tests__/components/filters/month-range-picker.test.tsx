import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonthRangePicker } from '../../../components/filters/MonthRangePicker'

const defaultValue = {
  start: new Date(2025, 0, 1),   // Jan 1, 2025
  end: new Date(2025, 11, 31),   // Dec 31, 2025
}

describe('MonthRangePicker', () => {
  it('renders DESDE and HASTA labels', () => {
    render(<MonthRangePicker value={defaultValue} onChange={vi.fn()} />)
    expect(screen.getByText(/desde/i)).toBeInTheDocument()
    expect(screen.getByText(/hasta/i)).toBeInTheDocument()
  })

  it('shows formatted start date in the Desde trigger', () => {
    render(<MonthRangePicker value={defaultValue} onChange={vi.fn()} />)
    expect(screen.getByText(/01 Ene 2025/i)).toBeInTheDocument()
  })

  it('shows formatted end date in the Hasta trigger', () => {
    render(<MonthRangePicker value={defaultValue} onChange={vi.fn()} />)
    expect(screen.getByText(/31 Dic 2025/i)).toBeInTheDocument()
  })

  it('displays error message when provided', () => {
    render(
      <MonthRangePicker
        value={defaultValue}
        onChange={vi.fn()}
        error="La fecha de inicio debe ser anterior a la fecha fin"
      />
    )
    expect(
      screen.getByText('La fecha de inicio debe ser anterior a la fecha fin')
    ).toBeInTheDocument()
  })

  it('does not display error message when not provided', () => {
    render(<MonthRangePicker value={defaultValue} onChange={vi.fn()} />)
    expect(
      screen.queryByText('La fecha de inicio debe ser anterior a la fecha fin')
    ).not.toBeInTheDocument()
  })
})
