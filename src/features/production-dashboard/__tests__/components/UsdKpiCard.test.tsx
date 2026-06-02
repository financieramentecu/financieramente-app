import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsdKpiCard } from '../../components/UsdKpiCard'

describe('UsdKpiCard', () => {
  it('renders skeleton when loading', () => {
    const { container } = render(
      <UsdKpiCard
        label="Test Card"
        valueUsd={null}
        count={0}
        isLoading={true}
      />
    )
    expect(container.querySelector('[data-testid="kpi-skeleton"]')).toBeTruthy()
  })

  it('renders formatted USD value and count', () => {
    render(
      <UsdKpiCard
        label="Detalle internacional"
        valueUsd={2500}
        count={3}
        isLoading={false}
      />
    )
    // Format: "USD 2,500.00 · 3 negocios"
    expect(screen.getByText(/USD.*2[,.]500/i)).toBeTruthy()
    expect(screen.getByText(/3 negocio/i)).toBeTruthy()
  })

  it('renders dash when valueUsd is null (no TRM available)', () => {
    render(
      <UsdKpiCard
        label="Nacional"
        valueUsd={null}
        count={3}
        isLoading={false}
      />
    )
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('renders legend when provided', () => {
    render(
      <UsdKpiCard
        label="Nacional convertido"
        valueUsd={2000}
        count={3}
        isLoading={false}
        legend="TRM promedio 4,050 • COP $8,100,000"
      />
    )
    expect(screen.getByText(/TRM promedio/i)).toBeTruthy()
  })

  it('renders zero USD value correctly', () => {
    render(
      <UsdKpiCard
        label="Total"
        valueUsd={0}
        count={0}
        isLoading={false}
      />
    )
    expect(screen.getByText(/USD.*0\.00/i)).toBeTruthy()
    expect(screen.getByText(/0 negocio/i)).toBeTruthy()
  })

  it('renders label text', () => {
    render(
      <UsdKpiCard
        label="Venta internacional"
        valueUsd={100}
        count={1}
        isLoading={false}
      />
    )
    expect(screen.getByText('Venta internacional')).toBeTruthy()
  })
})
