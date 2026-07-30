import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCellBusinesses } from '../../hooks/use-cell-businesses'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

const baseFilters: DashboardAppliedFilters = {
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

function makeBusiness(id: number) {
  return {
    id,
    contract: `C-${id}`,
    term: 12,
    value: 1000 * id,
    status: 'EMITIDO',
    createdAt: '2026-01-05T00:00:00.000Z',
    dateIssued: null,
    client: { id: 1, fullName: 'Cliente', name: 'Cliente', lastName: null, identityNumber: '123', email: null, phone: null },
    agent: { id: 7, fullName: 'Agente', roleName: null, categoryName: null, email: 'a@a.com', phone: null },
    product: { id: 1, name: 'Producto', companyId: 5, companyName: 'Empresa X' },
    currency: { id: 1, name: 'COP' },
    periodicity: null,
    clientOrigin: { id: 1, name: 'Origen' },
  }
}

function mockFetchPage(businesses: unknown[], page: number, totalPages: number, total: number) {
  return {
    ok: true,
    json: async () => ({
      data: {
        businesses,
        pagination: { page, pageSize: 100, total, totalPages },
      },
    }),
  } as Response
}

function baseInput(overrides: Partial<Parameters<typeof useCellBusinesses>[0]> = {}) {
  return {
    idUser: 7,
    idCompany: 5,
    appliedFilters: baseFilters,
    periodicityIdByName: new Map<string, number>(),
    ...overrides,
  }
}

describe('useCellBusinesses', () => {
  it('(a) fetches one page and maps businesses when totalPages === 1', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchPage([makeBusiness(1), makeBusiness(2)], 1, 1, 2)
    )

    const input = baseInput()
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data?.businesses).toHaveLength(2)
    expect(result.current.data?.total).toBe(2)
    expect(result.current.data?.isTruncated).toBe(false)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('(b) loops fetching subsequent pages until totalPages is reached', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchPage([makeBusiness(1)], 1, 3, 3))
      .mockResolvedValueOnce(mockFetchPage([makeBusiness(2)], 2, 3, 3))
      .mockResolvedValueOnce(mockFetchPage([makeBusiness(3)], 3, 3, 3))
    global.fetch = fetchMock

    const input = baseInput()
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data?.businesses).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result.current.data?.isTruncated).toBe(false)
  })

  it('(c) MAX_PAGES=5 caps the loop and sets isTruncated when totalPages > 5', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      mockFetchPage([makeBusiness(1)], 1, 8, 800)
    )
    global.fetch = fetchMock

    const input = baseInput()
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(result.current.data?.isTruncated).toBe(true)
    expect(result.current.data?.total).toBe(800)
  })

  it('(d) refetches when appliedFilters changes (no expansion state involved here)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchPage([makeBusiness(1)], 1, 1, 1))
    global.fetch = fetchMock

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useCellBusinesses>[0]) => useCellBusinesses(props),
      { initialProps: baseInput() }
    )

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const changedFilters: DashboardAppliedFilters = { ...baseFilters, statuses: ['EMITIDO'] }
    rerender(baseInput({ appliedFilters: changedFilters }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('(e) error state on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: 'Parámetros inválidos' }),
    } as Response)

    const input = baseInput()
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeUndefined()
  })

  it('(f) error state on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const input = baseInput()
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('(g) empty state — zero-result success is not an error', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchPage([], 1, 1, 0))

    const input = baseInput()
    const { result } = renderHook(() => useCellBusinesses(input))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data?.businesses).toHaveLength(0)
    expect(result.current.data?.total).toBe(0)
  })
})
