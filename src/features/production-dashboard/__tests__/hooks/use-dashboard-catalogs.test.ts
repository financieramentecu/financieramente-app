import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useDashboardCatalogs,
  resetDashboardCatalogsRequest,
} from '../../hooks/use-dashboard-catalogs'

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

import { apiClient } from '@/lib/api/client'

const mockGet = vi.mocked(apiClient.get)

describe('useDashboardCatalogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDashboardCatalogsRequest()
  })

  it('starts in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useDashboardCatalogs())
    expect(result.current.status).toBe('loading')
  })

  it('returns catalog data on success', async () => {
    mockGet.mockResolvedValue({
      data: {
        companies:      [{ id: 1, name: 'Skandia' }],
        products:       [{ id: 10, name: 'Vida', idCompany: 1 }],
        origins:        [{ id: 2, name: 'Propio' }],
        categories:     [{ id: 5, name: 'Senior' }],
        periodicidades: [{ id: 1, name: 'MENSUAL' }],
      },
    })

    const { result } = renderHook(() => useDashboardCatalogs())

    await waitFor(() => expect(result.current.status).toBe('success'))

    if (result.current.status !== 'success') throw new Error('Expected success')
    expect(result.current.data.companies).toHaveLength(1)
    expect(result.current.data.companies[0].name).toBe('Skandia')
    expect(result.current.data.products).toHaveLength(1)
    expect(result.current.data.products[0].idCompany).toBe(1)
    expect(result.current.data.origins).toHaveLength(1)
    expect(result.current.data.categories).toHaveLength(1)
    expect(result.current.data.periodicidades).toHaveLength(1)
    expect(result.current.data.periodicidades[0].name).toBe('MENSUAL')
  })

  it('sets status to error when API returns null data', async () => {
    mockGet.mockResolvedValue({ data: null, error: 'Server error' })

    const { result } = renderHook(() => useDashboardCatalogs())

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('sets status to error when API throws', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDashboardCatalogs())

    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('shares one request between consumers mounted at the same time', async () => {
    mockGet.mockResolvedValue({
      data: {
        companies: [], products: [], origins: [], categories: [], periodicidades: [],
      },
    })

    const first = renderHook(() => useDashboardCatalogs())
    const second = renderHook(() => useDashboardCatalogs())

    await waitFor(() => expect(first.result.current.status).toBe('success'))
    await waitFor(() => expect(second.result.current.status).toBe('success'))
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('loads fresh data when a consumer mounts after the previous request settled', async () => {
    mockGet.mockResolvedValue({
      data: {
        companies: [], products: [], origins: [], categories: [], periodicidades: [],
      },
    })

    const first = renderHook(() => useDashboardCatalogs())
    await waitFor(() => expect(first.result.current.status).toBe('success'))

    const second = renderHook(() => useDashboardCatalogs())
    await waitFor(() => expect(second.result.current.status).toBe('success'))
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})
