import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardCatalogs } from '../../hooks/use-dashboard-catalogs'

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

import { apiClient } from '@/lib/api/client'

const mockGet = vi.mocked(apiClient.get)

describe('useDashboardCatalogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in loading state', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useDashboardCatalogs())
    expect(result.current.isLoading).toBe(true)
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

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isError).toBe(false)
    expect(result.current.companies).toHaveLength(1)
    expect(result.current.companies[0].name).toBe('Skandia')
    expect(result.current.products).toHaveLength(1)
    expect(result.current.products[0].idCompany).toBe(1)
    expect(result.current.origins).toHaveLength(1)
    expect(result.current.categories).toHaveLength(1)
    expect(result.current.periodicidades).toHaveLength(1)
    expect(result.current.periodicidades[0].name).toBe('MENSUAL')
  })

  it('sets isError=true when API returns null data', async () => {
    mockGet.mockResolvedValue({ data: null, error: 'Server error' })

    const { result } = renderHook(() => useDashboardCatalogs())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(true)
  })

  it('sets isError=true when API throws', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDashboardCatalogs())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isError).toBe(true)
  })
})
