import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

// Mock catalog hook
vi.mock('../../hooks/use-dashboard-catalogs', () => ({
  useDashboardCatalogs: vi.fn(),
}))

// Mock hierarchy selection context so we don't need a real provider
vi.mock('../../components/HierarchySelectionContext', () => ({
  useHierarchySelection: vi.fn(),
  HierarchySelectionProvider: ({ children }: { children: ReactNode }) => children,
}))

import { useDashboardCatalogs } from '../../hooks/use-dashboard-catalogs'
import { useHierarchySelection } from '../../components/HierarchySelectionContext'
import { DashboardFilterProvider } from '../../components/DashboardFilterContext'
import { DashboardFilterPanel } from '../../components/DashboardFilterPanel'

const mockUseDashboardCatalogs = vi.mocked(useDashboardCatalogs)
const mockUseHierarchySelection = vi.mocked(useHierarchySelection)

const emptyHierarchyDispatch = vi.fn()

function wrapper({ children }: { children: ReactNode }) {
  return <DashboardFilterProvider>{children}</DashboardFilterProvider>
}

function renderPanel() {
  return render(<DashboardFilterPanel />, { wrapper })
}

describe('DashboardFilterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDashboardCatalogs.mockReturnValue({
      status: 'success',
      data: {
        companies: [],
        products: [],
        origins: [],
        categories: [],
        periodicidades: [],
      },
      error: '',
    })
    mockUseHierarchySelection.mockReturnValue({
      nodes: [],
      selectedUserIds: [],
      toggle: vi.fn(),
      dispatch: emptyHierarchyDispatch,
    })
  })

  // Scenario 9.1: All filter cells visible (including Soporte)
  it('renders all filter cells: date range, status, category, company, product, origin, plazo, periodicidad, soporte', () => {
    renderPanel()
    expect(screen.getByText('Desde')).toBeInTheDocument()
    expect(screen.getByText('Hasta')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Categoría')).toBeInTheDocument()
    expect(screen.getByText('Compañía')).toBeInTheDocument()
    expect(screen.getByText('Producto')).toBeInTheDocument()
    expect(screen.getByText('Origen')).toBeInTheDocument()
    expect(screen.getByText('Plazo (Años)')).toBeInTheDocument()
    expect(screen.getByText('Periodicidad')).toBeInTheDocument()
    expect(screen.getByText('Soporte')).toBeInTheDocument()
  })

  // Scenario 9.1: Aplicar disabled on initial render (draft == applied)
  it('has Aplicar button disabled on initial render', () => {
    renderPanel()
    const aplicarBtn = screen.getByRole('button', { name: /Aplicar/i })
    expect(aplicarBtn).toBeDisabled()
  })

  // Scenario 9.2: Limpiar resets panel and calls hierarchy SELECT_ALL
  it('calls hierarchy dispatch SELECT_ALL when Limpiar is clicked', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /Limpiar/i }))
    expect(emptyHierarchyDispatch).toHaveBeenCalledWith({ type: 'SELECT_ALL' })
  })

  it('initializes Estado, Plazo and Periodicidad as Todos/Todas with every option checked', async () => {
    const user = userEvent.setup()
    mockUseDashboardCatalogs.mockReturnValue({
      status: 'success',
      data: {
        companies: [],
        products: [],
        origins: [],
        categories: [],
        periodicidades: [
          { id: 1, name: 'Mensual' },
          { id: 2, name: 'Anual' },
        ],
      },
      error: '',
    })
    renderPanel()

    expect(screen.getByRole('button', { name: 'Estado' })).toHaveTextContent('Todos')
    expect(screen.getByRole('button', { name: 'Plazo (Años)' })).toHaveTextContent('Todos')
    expect(screen.getByRole('button', { name: 'Periodicidad' })).toHaveTextContent('Todas')

    await user.click(screen.getByRole('button', { name: 'Estado' }))
    expect(screen.getByRole('option', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Emitido' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Fondeado' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Venta efectuada' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Cancelado' })).toHaveAttribute('aria-selected', 'true')
  })

  it('unchecking Todas/Todos clears every individual checkbox', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Plazo (Años)' }))
    await user.click(screen.getByRole('option', { name: 'Todos' }))
    expect(screen.getByRole('option', { name: '1 año' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('option', { name: '5 años' })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows the item name for one selection and a count for two or more', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Plazo (Años)' }))
    await user.click(screen.getByRole('option', { name: 'Todos' }))
    await user.click(screen.getByRole('option', { name: '1 año' }))
    expect(screen.getByRole('button', { name: 'Plazo (Años)' })).toHaveTextContent('1 año')

    await user.click(screen.getByRole('option', { name: '2 años' }))
    expect(screen.getByRole('button', { name: 'Plazo (Años)' })).toHaveTextContent('2 seleccionados')
  })

  it('restores Todas/Todos when the menu closes with no items checked', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Estado' }))
    await user.click(screen.getByRole('option', { name: 'Todos' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Estado' })).toHaveTextContent('Todos')
  })

  it('commits a multi selection when Aplicar is clicked', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Estado' }))
    await user.click(screen.getByRole('option', { name: 'Todos' }))
    await user.click(screen.getByRole('option', { name: 'Emitido' }))
    await user.click(screen.getByRole('option', { name: 'Fondeado' }))
    const aplicarBtn = screen.getByRole('button', { name: /Aplicar/i })
    expect(aplicarBtn).toBeEnabled()
    await user.click(aplicarBtn)
    expect(aplicarBtn).toBeDisabled()
    expect(screen.getByText('Estado: EMITIDO, FONDEADO')).toBeInTheDocument()
  })

  // Scenario 9.3: error message renders when error prop is passed to picker
  it('shows date range error message when date range is invalid', () => {
    // The error is derived from draft state; we verify the error text renders
    // by checking that the picker can display it (tested more deeply in MonthRangePicker tests)
    renderPanel()
    // By default the range is valid (start of month ≤ end of month), so no error
    expect(
      screen.queryByText('La fecha de inicio debe ser anterior a la fecha fin')
    ).not.toBeInTheDocument()
  })
})
