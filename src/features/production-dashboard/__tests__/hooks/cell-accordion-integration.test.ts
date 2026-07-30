import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCellBusinesses } from '../../hooks/use-cell-businesses'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'
import type { HeatmapRaw } from '../../types/production-kpi.types'

/**
 * Integration/reconciliation tests (design.md Testing Strategy — Integration row).
 * These exercise the accordion's data path end-to-end against a *shared*
 * business fixture: the same rows feed both the mocked heatmap cell
 * aggregate and the mocked `/api/negocios` response, so any drift between
 * the two data paths would show up as a mismatch here.
 */

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

const sharedFilters: DashboardAppliedFilters = {
  dateRange: { start: new Date('2026-01-01T12:00:00Z'), end: new Date('2026-01-31T12:00:00Z') },
  statuses: [],
  categoryIds: [],
  companyIds: [],
  productIds: [],
  originIds: [],
  plazos: [],
  periodicidades: [],
  isInternacional: false,
}

// ─── Shared fixture: raw business rows behind one heatmap cell ─────────────────

interface RawBusinessFixture {
  readonly idBusiness: number
  readonly idUser: number
  readonly idCompany: number
  readonly companyName: string
  readonly value: number
  readonly currency: 'COP' | 'USD'
}

const CELL_USER_ID = 7
const CELL_COMPANY_ID = 5
const CELL_COMPANY_NAME = 'Empresa X'

const cellFixtureRows: RawBusinessFixture[] = [
  { idBusiness: 1, idUser: CELL_USER_ID, idCompany: CELL_COMPANY_ID, companyName: CELL_COMPANY_NAME, value: 100_000, currency: 'COP' },
  { idBusiness: 2, idUser: CELL_USER_ID, idCompany: CELL_COMPANY_ID, companyName: CELL_COMPANY_NAME, value: 200_000, currency: 'COP' },
  { idBusiness: 3, idUser: CELL_USER_ID, idCompany: CELL_COMPANY_ID, companyName: CELL_COMPANY_NAME, value: 500, currency: 'USD' },
]

/** Builds the mocked heatmap cell aggregate the same way heatmap.service.ts does. */
function buildMockedHeatmapCell(rows: RawBusinessFixture[]): HeatmapRaw['cells'][number] {
  return {
    idCompany: CELL_COMPANY_ID,
    companyName: CELL_COMPANY_NAME,
    copTotal: rows.filter((r) => r.currency === 'COP').reduce((sum, r) => sum + r.value, 0),
    foreignUsdTotal: rows.filter((r) => r.currency === 'USD').reduce((sum, r) => sum + r.value, 0),
    count: rows.length,
  }
}

/** Maps the shared fixture rows into the exact BusinessEntity shape /api/negocios returns. */
function toBusinessEntity(row: RawBusinessFixture) {
  return {
    id: row.idBusiness,
    contract: `C-${row.idBusiness}`,
    term: 12,
    value: row.value,
    status: 'EMITIDO',
    createdAt: '2026-01-05T00:00:00.000Z',
    dateIssued: null,
    client: { id: 1, fullName: 'Cliente', name: 'Cliente', lastName: null, identityNumber: '123', email: null, phone: null },
    agent: { id: row.idUser, fullName: 'Agente', roleName: null, categoryName: null, email: 'a@a.com', phone: null },
    product: { id: 1, name: 'Producto', companyId: row.idCompany, companyName: row.companyName },
    currency: { id: row.currency === 'COP' ? 1 : 2, name: row.currency },
    periodicity: null,
    clientOrigin: { id: 1, name: 'Origen' },
  }
}

function mockNegociosResponse(rows: RawBusinessFixture[]) {
  return {
    ok: true,
    json: async () => ({
      data: {
        businesses: rows.map(toBusinessEntity),
        pagination: { page: 1, pageSize: 100, total: rows.length, totalPages: 1 },
      },
    }),
  } as Response
}

describe('Heatmap cell business accordion — reconciliation', () => {
  it('(5.1) expanded list count and per-currency sums equal the cell aggregate under identical filters', async () => {
    const cellAggregate = buildMockedHeatmapCell(cellFixtureRows)
    global.fetch = vi.fn().mockResolvedValue(mockNegociosResponse(cellFixtureRows))

    const input = {
      idUser: CELL_USER_ID,
      idCompany: CELL_COMPANY_ID,
      appliedFilters: sharedFilters,
      periodicityIdByName: new Map<string, number>(),
    }
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('success'))

    const businesses = result.current.data?.businesses ?? []
    expect(businesses).toHaveLength(cellAggregate.count)

    const copSum = businesses
      .filter((b) => b.currencyName === 'COP')
      .reduce((sum, b) => sum + (b.value ?? 0), 0)
    const usdSum = businesses
      .filter((b) => b.currencyName === 'USD')
      .reduce((sum, b) => sum + (b.value ?? 0), 0)

    expect(copSum).toBe(cellAggregate.copTotal)
    expect(usdSum).toBe(cellAggregate.foreignUsdTotal)
  })

  it('(5.1b) stays reconciled after a filter change refetches with an updated fixture', async () => {
    const initialAggregate = buildMockedHeatmapCell(cellFixtureRows)
    const updatedRows = [...cellFixtureRows, { idBusiness: 4, idUser: CELL_USER_ID, idCompany: CELL_COMPANY_ID, companyName: CELL_COMPANY_NAME, value: 50_000, currency: 'COP' as const }]
    const updatedAggregate = buildMockedHeatmapCell(updatedRows)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockNegociosResponse(cellFixtureRows))
      .mockResolvedValueOnce(mockNegociosResponse(updatedRows))
    global.fetch = fetchMock

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useCellBusinesses>[0]) => useCellBusinesses(props),
      {
        initialProps: {
          idUser: CELL_USER_ID,
          idCompany: CELL_COMPANY_ID,
          appliedFilters: sharedFilters,
          periodicityIdByName: new Map<string, number>(),
        },
      }
    )

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data?.businesses).toHaveLength(initialAggregate.count)

    const changedFilters: DashboardAppliedFilters = { ...sharedFilters, statuses: ['EMITIDO'] }
    rerender({
      idUser: CELL_USER_ID,
      idCompany: CELL_COMPANY_ID,
      appliedFilters: changedFilters,
      periodicityIdByName: new Map<string, number>(),
    })

    await waitFor(() =>
      expect(result.current.data?.businesses).toHaveLength(updatedAggregate.count)
    )
  })

  it('(5.2) a viewer whose fetch is scoped outside the cell advisor gets an empty list, never a leaked business', async () => {
    // Simulates the server-side enforcement /api/negocios already applies via
    // resolveVisibleUserIds: even if a cell for an out-of-scope advisor were
    // ever requested, the list layer returns zero rows — no leak. The Phase 1
    // fix (resolveViewerScope / isFullTreeViewer dropping the dead
    // GENERAL_LEVEL bypass) is what prevents such an out-of-scope cell from
    // being rendered by the heatmap in the first place (see
    // heatmap.service.test.ts and hierarchy-tree.service.test.ts).
    const OUT_OF_SCOPE_USER_ID = 999
    global.fetch = vi.fn().mockResolvedValue(mockNegociosResponse([]))

    const input = {
      idUser: OUT_OF_SCOPE_USER_ID,
      idCompany: CELL_COMPANY_ID,
      appliedFilters: sharedFilters,
      periodicityIdByName: new Map<string, number>(),
    }
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data?.businesses).toHaveLength(0)
    expect(result.current.data?.total).toBe(0)
  })
})
