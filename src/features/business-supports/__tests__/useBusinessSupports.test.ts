import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/business-supports-api', () => ({
  businessSupportsApi: {
    list: vi.fn(),
  },
}))

import { useBusinessSupports } from '../hooks/useBusinessSupports'
import { businessSupportsApi } from '../lib/business-supports-api'

const mockList = vi.mocked(businessSupportsApi.list)

const mockComprobante = {
  id: 'cuid-1',
  businessId: 42,
  objectKey: 'negocios/42/2026/abc.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  uploadedBy: { id: 1, name: 'Ana García' },
  createdAt: '2026-05-14T10:00:00Z',
  viewUrl: 'https://cdn.example.com/negocios/42/abc.jpg',
}

describe('useBusinessSupports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in loading state', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useBusinessSupports(42))
    expect(result.current.state.status).toBe('loading')
  })

  it('transitions to success with data', async () => {
    mockList.mockResolvedValue([mockComprobante])
    const { result } = renderHook(() => useBusinessSupports(42))

    await waitFor(() => expect(result.current.state.status).toBe('success'))

    if (result.current.state.status === 'success') {
      expect(result.current.state.data).toHaveLength(1)
      expect(result.current.state.data[0].id).toBe('cuid-1')
    }
  })

  it('transitions to error on API failure', async () => {
    mockList.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useBusinessSupports(42))

    await waitFor(() => expect(result.current.state.status).toBe('error'))

    if (result.current.state.status === 'error') {
      expect(result.current.state.error).toContain('Network error')
    }
  })

  it('calls list with the correct businessId', async () => {
    mockList.mockResolvedValue([])
    renderHook(() => useBusinessSupports(99))

    await waitFor(() => expect(mockList).toHaveBeenCalledWith(99))
  })

  it('refetch reloads data', async () => {
    mockList.mockResolvedValue([])
    const { result } = renderHook(() => useBusinessSupports(42))

    await waitFor(() => expect(result.current.state.status).toBe('success'))

    mockList.mockResolvedValue([mockComprobante])
    await act(async () => { await result.current.refetch() })

    await waitFor(() => {
      if (result.current.state.status === 'success') {
        expect(result.current.state.data).toHaveLength(1)
      }
    })
  })
})
