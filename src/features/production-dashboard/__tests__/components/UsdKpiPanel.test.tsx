import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock hooks before importing the panel
vi.mock('../../hooks/use-production-kpis', () => ({
  useProductionKpis: vi.fn(),
}))
vi.mock('../../components/HierarchySelectionContext', () => ({
  useHierarchySelection: vi.fn(),
}))
vi.mock('../../components/DashboardFilterContext', () => ({
  useDashboardFilter: vi.fn(),
}))

import { useProductionKpis } from '../../hooks/use-production-kpis'
import { useHierarchySelection } from '../../components/HierarchySelectionContext'
import { useDashboardFilter } from '../../components/DashboardFilterContext'
import { UsdKpiPanel } from '../../components/UsdKpiPanel'

const mockUseProductionKpis = vi.mocked(useProductionKpis)
const mockUseHierarchySelection = vi.mocked(useHierarchySelection)
const mockUseDashboardFilter = vi.mocked(useDashboardFilter)

const defaultTrmProps = {
  isLoading: false,
  trmRate: 4050 as number | null,
  trmState: 'auto' as const,
  isManual: false,
  error: '',
  setManualTrm: vi.fn(),
}

function setupContextMocks() {
  mockUseHierarchySelection.mockReturnValue({
    selectedUserIds: [1, 2],
    nodes: [],
    toggle: vi.fn(),
    dispatch: vi.fn(),
  })
  mockUseDashboardFilter.mockReturnValue({
    draft: {} as never,
    appliedFilters: {
      dateRange: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
      statuses: [],
      categoryIds: [],
      companyIds: [],
      productIds: [],
      originIds: [],
      plazos: [],
      periodicidades: [],
      isInternacional: false,
    },
    dispatch: vi.fn(),
    isApplyEnabled: false,
    periodLabel: '',
    activeBadges: [],
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupContextMocks()
})

describe('UsdKpiPanel', () => {
  it('renders section heading', () => {
    mockUseProductionKpis.mockReturnValue({
      isLoading: false,
      isError: false,
      computed: {
        detaileForeignUsd: 500,
        nationalUsd: 2000,
        totalUsd: 2500,
        nationalCount: 3,
        foreignCount: 2,
        totalCount: 5,
        totalCop: 8100000,
      },
    })

    render(<UsdKpiPanel {...defaultTrmProps} />)
    expect(screen.getByText(/Venta total/i)).toBeTruthy()
  })

  it('renders TrmDisplay and 3 UsdKpiCard components', () => {
    mockUseProductionKpis.mockReturnValue({
      isLoading: false,
      isError: false,
      computed: {
        detaileForeignUsd: 500,
        nationalUsd: 2000,
        totalUsd: 2500,
        nationalCount: 3,
        foreignCount: 2,
        totalCount: 5,
        totalCop: 8100000,
      },
    })

    render(<UsdKpiPanel {...defaultTrmProps} />)
    // 3 cards rendered
    expect(screen.getByText(/Detalle internacional/i)).toBeTruthy()
    expect(screen.getByText(/Nacional convertido/i)).toBeTruthy()
    expect(screen.getByText(/Total USD/i)).toBeTruthy()
  })

  it('shows nacional and total as null (—) when trmState is error and no manual TRM', () => {
    mockUseProductionKpis.mockReturnValue({
      isLoading: false,
      isError: false,
      computed: {
        detaileForeignUsd: 500,
        nationalUsd: 0,
        totalUsd: 500,
        nationalCount: 3,
        foreignCount: 2,
        totalCount: 5,
        totalCop: 8100000,
      },
    })

    render(<UsdKpiPanel
      isLoading={false}
      trmRate={null}
      trmState="error"
      isManual={false}
      error="No fue posible consultar la TRM automáticamente"
      setManualTrm={vi.fn()}
    />)
    // Nacional and Total show "—" when no TRM
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('shows detalle internacional value regardless of TRM state', () => {
    mockUseProductionKpis.mockReturnValue({
      isLoading: false,
      isError: false,
      computed: {
        detaileForeignUsd: 500,
        nationalUsd: 0,
        totalUsd: 500,
        nationalCount: 3,
        foreignCount: 2,
        totalCount: 5,
        totalCop: 8100000,
      },
    })

    render(<UsdKpiPanel
      isLoading={false}
      trmRate={null}
      trmState="error"
      isManual={false}
      error="No fue posible consultar la TRM automáticamente"
      setManualTrm={vi.fn()}
    />)
    // Detalle card shows value even in error state
    expect(screen.getByText(/USD.*500/i)).toBeTruthy()
  })

  it('calls setManualTrm when Recalcular is clicked in TrmDisplay', async () => {
    const mockSetManualTrm = vi.fn()
    mockUseProductionKpis.mockReturnValue({
      isLoading: false,
      isError: false,
      computed: null,
    })

    render(<UsdKpiPanel
      isLoading={false}
      trmRate={null}
      trmState="error"
      isManual={false}
      error="Error"
      setManualTrm={mockSetManualTrm}
    />)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '4200' } })
    fireEvent.click(screen.getByRole('button', { name: /Recalcular/i }))

    await waitFor(() => {
      expect(mockSetManualTrm).toHaveBeenCalledWith(4200)
    })
  })
})
