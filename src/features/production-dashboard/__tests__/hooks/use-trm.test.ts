import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTrm } from '../../hooks/use-trm'

let originalFetch: typeof global.fetch

beforeEach(() => {
  originalFetch = global.fetch
  vi.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

function mockFetchSuccess(valor: number) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        valor,
        fetchedAt: '2025-05-27T00:00:00Z',
        nombre: 'Dólar',
        unidad: 'USD',
      },
    }),
  } as Response)
}

function mockFetchFailure() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 502,
    json: async () => ({ data: null, error: 'No disponible' }),
  } as Response)
}

function mockFetchNetworkError() {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
}

describe('useTrm', () => {
  it('starts in loading state', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useTrm())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.trmRate).toBeNull()
    expect(result.current.trmState).toBe('error')
  })

  it('transitions to auto state on successful fetch', async () => {
    mockFetchSuccess(4050)
    const { result } = renderHook(() => useTrm())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.trmState).toBe('auto')
    expect(result.current.trmRate).toBe(4050)
    expect(result.current.error).toBe('')
  })

  it('transitions to error state when fetch returns non-ok', async () => {
    mockFetchFailure()
    const { result } = renderHook(() => useTrm())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.trmState).toBe('error')
    expect(result.current.trmRate).toBeNull()
    expect(result.current.error).toBeTruthy()
  })

  it('transitions to error state when fetch throws', async () => {
    mockFetchNetworkError()
    const { result } = renderHook(() => useTrm())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.trmState).toBe('error')
    expect(result.current.trmRate).toBeNull()
  })

  it('setManualTrm updates trmRate and sets state to manual', async () => {
    mockFetchFailure()
    const { result } = renderHook(() => useTrm())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    result.current.setManualTrm(4200)

    await waitFor(() => expect(result.current.trmState).toBe('manual'))
    expect(result.current.trmRate).toBe(4200)
    expect(result.current.isManual).toBe(true)
  })

  it('does not re-fetch TRM when setManualTrm is called', async () => {
    mockFetchSuccess(4050)
    const { result } = renderHook(() => useTrm())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const fetchCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length

    result.current.setManualTrm(4200)
    await waitFor(() => expect(result.current.trmRate).toBe(4200))

    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallCount)
  })

  it('fetches from /api/trm on mount', async () => {
    mockFetchSuccess(4050)
    renderHook(() => useTrm())

    await waitFor(() => {
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/trm'),
        expect.any(Object)
      )
    })
  })
})
