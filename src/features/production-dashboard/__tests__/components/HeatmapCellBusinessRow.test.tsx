import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeatmapCellBusinessRow } from '@/features/production-dashboard/components/HeatmapCellBusinessRow'
import type { CellBusinessRowView } from '@/features/production-dashboard/types/heatmap-cell-expansion.types'

const completeBusiness: CellBusinessRowView = {
  idBusiness: 123,
  companyName: 'Empresa X',
  productName: 'Producto A',
  contract: 'C-001',
  value: 5000,
  currencyName: 'USD',
  status: 'EMITIDO',
}

function renderRow(business: CellBusinessRowView) {
  return render(
    <table>
      <tbody>
        <HeatmapCellBusinessRow business={business} />
      </tbody>
    </table>
  )
}

describe('HeatmapCellBusinessRow', () => {
  it('(a) renders product, contract, value+currency, and status when all fields are present', () => {
    renderRow(completeBusiness)

    expect(screen.getByText('Producto A')).toBeInTheDocument()
    expect(screen.getByText('C-001')).toBeInTheDocument()
    expect(screen.getByText(/USD/)).toBeInTheDocument()
    expect(screen.getByText('Emitido')).toBeInTheDocument()
  })

  it('(b) renders "-" for a missing value, row still appears', () => {
    renderRow({ ...completeBusiness, value: null, currencyName: null })

    const row = screen.getByText('C-001').closest('tr')
    expect(row).not.toBeNull()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('(c) renders "-" for a missing product, row still appears', () => {
    renderRow({ ...completeBusiness, productName: null })

    expect(screen.getByText('C-001')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('(d) "Ir a negocio" link has target=_blank, rel=noopener noreferrer, and correct href', () => {
    renderRow(completeBusiness)

    const link = screen.getByRole('link', { name: 'Ir a negocio' })
    expect(link).toHaveAttribute('href', '/dashboard/negocios/123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
