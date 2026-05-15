import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/business-supports-api', () => ({
  businessSupportsApi: {
    remove: vi.fn(),
  },
}))

import { useDeleteComprobante } from '../hooks/useDeleteComprobante'
import { businessSupportsApi } from '../lib/business-supports-api'

const mockRemove = vi.mocked(businessSupportsApi.remove)

describe('useDeleteComprobante', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts in idle state', () => {
    const { result } = renderHook(() => useDeleteComprobante(42))
    expect(result.current.state.status).toBe('idle')
  })

  it('transitions to success after removal', async () => {
    mockRemove.mockResolvedValue({ success: true })
    const { result } = renderHook(() => useDeleteComprobante(42))

    await act(async () => {
      await result.current.remove('cuid-1')
    })

    expect(mockRemove).toHaveBeenCalledWith(42, 'cuid-1')
    expect(result.current.state.status).toBe('success')
  })

  it('transitions to error on failure', async () => {
    mockRemove.mockRejectedValue(new Error('Server error'))
    const { result } = renderHook(() => useDeleteComprobante(42))

    await act(async () => {
      await result.current.remove('cuid-1')
    })

    expect(result.current.state.status).toBe('error')
  })

  it('reset() returns to idle', async () => {
    mockRemove.mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useDeleteComprobante(42))

    await act(async () => { await result.current.remove('x') })
    expect(result.current.state.status).toBe('error')

    act(() => { result.current.reset() })
    expect(result.current.state.status).toBe('idle')
  })
})
