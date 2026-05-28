import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrmDisplay } from '../../components/TrmDisplay'

describe('TrmDisplay', () => {
  it('renders skeleton when loading', () => {
    const { container } = render(
      <TrmDisplay
        trmState="error"
        trmRate={null}
        isLoading={true}
        error=""
        onManualTrm={vi.fn()}
      />
    )
    // Skeleton element exists
    expect(container.querySelector('[data-testid="trm-skeleton"]')).toBeTruthy()
  })

  it('renders auto rate display when trmState is auto', () => {
    render(
      <TrmDisplay
        trmState="auto"
        trmRate={4050}
        isLoading={false}
        error=""
        onManualTrm={vi.fn()}
      />
    )
    expect(screen.getByText(/4[,.]050.*COP\/USD/i)).toBeTruthy()
  })

  it('renders error message and manual input when trmState is error', () => {
    render(
      <TrmDisplay
        trmState="error"
        trmRate={null}
        isLoading={false}
        error="No fue posible consultar la TRM automáticamente"
        onManualTrm={vi.fn()}
      />
    )
    expect(screen.getByText(/No fue posible consultar la TRM/i)).toBeTruthy()
    expect(screen.getByRole('spinbutton')).toBeTruthy() // number input
    expect(screen.getByRole('button', { name: /Recalcular/i })).toBeTruthy()
  })

  it('disables Recalcular button when input is empty', () => {
    render(
      <TrmDisplay
        trmState="error"
        trmRate={null}
        isLoading={false}
        error="Error"
        onManualTrm={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: /Recalcular/i })
    expect(button).toBeDisabled()
  })

  it('enables Recalcular button when valid positive number is entered', () => {
    render(
      <TrmDisplay
        trmState="error"
        trmRate={null}
        isLoading={false}
        error="Error"
        onManualTrm={vi.fn()}
      />
    )
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '4200' } })
    const button = screen.getByRole('button', { name: /Recalcular/i })
    expect(button).not.toBeDisabled()
  })

  it('calls onManualTrm with parsed value when Recalcular is clicked', () => {
    const mockOnManualTrm = vi.fn()
    render(
      <TrmDisplay
        trmState="error"
        trmRate={null}
        isLoading={false}
        error="Error"
        onManualTrm={mockOnManualTrm}
      />
    )
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '4200' } })
    fireEvent.click(screen.getByRole('button', { name: /Recalcular/i }))
    expect(mockOnManualTrm).toHaveBeenCalledWith(4200)
  })

  it('renders manual TRM label when trmState is manual', () => {
    render(
      <TrmDisplay
        trmState="manual"
        trmRate={4200}
        isLoading={false}
        error=""
        onManualTrm={vi.fn()}
      />
    )
    expect(screen.getByText(/TRM ingresada manualmente/i)).toBeTruthy()
  })

  it('disables Recalcular button when input is zero or negative', () => {
    render(
      <TrmDisplay
        trmState="error"
        trmRate={null}
        isLoading={false}
        error="Error"
        onManualTrm={vi.fn()}
      />
    )
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '0' } })
    expect(screen.getByRole('button', { name: /Recalcular/i })).toBeDisabled()
  })
})
