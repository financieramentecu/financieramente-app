import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/business-supports-api', () => ({
  businessSupportsApi: {
    presign: vi.fn(),
    persist: vi.fn(),
  },
}))

vi.mock('../lib/mime-utils', () => ({
  validateUpload: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { useUploadComprobante } from '../hooks/useUploadComprobante'
import { businessSupportsApi } from '../lib/business-supports-api'
import { validateUpload } from '../lib/mime-utils'

const mockPresign = vi.mocked(businessSupportsApi.presign)
const mockPersist = vi.mocked(businessSupportsApi.persist)
const mockValidateUpload = vi.mocked(validateUpload)

const makeFile = (name = 'photo.jpg', type = 'image/jpeg', size = 1024) =>
  new File(['x'.repeat(size)], name, { type })

const mockComprobante = {
  id: 'cuid-1',
  businessId: 42,
  objectKey: 'negocios/42/abc.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  uploadedBy: { id: 1, name: 'Ana' },
  createdAt: '2026-05-14T10:00:00Z',
}

describe('useUploadComprobante', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true })
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useUploadComprobante(42))
    expect(result.current.state.status).toBe('idle')
  })

  it('validates MIME type before uploading and returns error on invalid', async () => {
    mockValidateUpload.mockReturnValue({ ok: false, code: 'INVALID_MIME' })

    const { result } = renderHook(() => useUploadComprobante(42))

    await act(async () => {
      await result.current.upload(makeFile('doc.txt', 'text/plain'))
    })

    expect(result.current.state.status).toBe('error')
    expect(mockPresign).not.toHaveBeenCalled()
  })

  it('follows presign → PUT → persist flow on success', async () => {
    mockValidateUpload.mockReturnValue({ ok: true })
    mockPresign.mockResolvedValue({ url: 'https://spaces.example.com/put', key: 'negocios/42/abc.jpg' })
    mockPersist.mockResolvedValue(mockComprobante)

    const { result } = renderHook(() => useUploadComprobante(42))
    const file = makeFile()

    await act(async () => {
      await result.current.upload(file)
    })

    expect(mockPresign).toHaveBeenCalledWith(42, 'image/jpeg', file.size)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://spaces.example.com/put',
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(mockPersist).toHaveBeenCalledWith(42, {
      key: 'negocios/42/abc.jpg',
      mime: 'image/jpeg',
      size: file.size,
    })
    expect(result.current.state.status).toBe('success')
    if (result.current.state.status === 'success') {
      expect(result.current.state.data.id).toBe('cuid-1')
    }
  })

  it('transitions to error when presign fails', async () => {
    mockValidateUpload.mockReturnValue({ ok: true })
    mockPresign.mockRejectedValue(new Error('Presign failed'))

    const { result } = renderHook(() => useUploadComprobante(42))

    await act(async () => {
      await result.current.upload(makeFile())
    })

    expect(result.current.state.status).toBe('error')
  })

  it('transitions to error when PUT upload fails (non-2xx)', async () => {
    mockValidateUpload.mockReturnValue({ ok: true })
    mockPresign.mockResolvedValue({ url: 'https://spaces.example.com/put', key: 'k' })
    mockFetch.mockResolvedValue({ ok: false, status: 403 })

    const { result } = renderHook(() => useUploadComprobante(42))

    await act(async () => {
      await result.current.upload(makeFile())
    })

    expect(result.current.state.status).toBe('error')
    expect(mockPersist).not.toHaveBeenCalled()
  })

  it('reset() returns hook to idle', async () => {
    mockValidateUpload.mockReturnValue({ ok: false, code: 'INVALID_MIME' })

    const { result } = renderHook(() => useUploadComprobante(42))

    await act(async () => { await result.current.upload(makeFile()) })

    expect(result.current.state.status).toBe('error')

    act(() => { result.current.reset() })

    expect(result.current.state.status).toBe('idle')
  })
})
