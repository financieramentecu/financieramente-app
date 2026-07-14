import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/comments-api', () => ({
  commentsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {}
  onerror: (() => void) | null = null
  close = vi.fn()

  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(event: string, cb: (e: MessageEvent) => void) {
    this.listeners[event] = [...(this.listeners[event] ?? []), cb]
  }

  emit(event: string, data: unknown) {
    for (const cb of this.listeners[event] ?? []) {
      cb({ data: JSON.stringify(data) } as MessageEvent)
    }
  }
}

// @ts-expect-error — test stub, not a full EventSource implementation
global.EventSource = FakeEventSource

import { useComments } from '../hooks/use-comments'
import { commentsApi } from '../lib/comments-api'
import type { CommentDTO } from '../types/comment.types'
import { UserRole } from '@/features/auth/lib/roles'

const mockList = vi.mocked(commentsApi.list)
const mockCreate = vi.mocked(commentsApi.create)

const COMMENT: CommentDTO = {
  id: 'comment-1',
  businessId: 42,
  title: 'Seguimiento',
  detail: 'Falta el comprobante',
  author: { id: 1, name: 'Ana Agente', role: UserRole.AGENTE },
  createdAt: '2026-07-01T12:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  FakeEventSource.instances = []
})

describe('useComments', () => {
  it('starts in loading state', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useComments(42))
    expect(result.current.state.status).toBe('loading')
  })

  it('transitions to success with the chronological thread', async () => {
    mockList.mockResolvedValue([COMMENT])
    const { result } = renderHook(() => useComments(42))

    await waitFor(() => expect(result.current.state.status).toBe('success'))
    if (result.current.state.status === 'success') {
      expect(result.current.state.data).toHaveLength(1)
    }
  })

  it('transitions to error on API failure', async () => {
    mockList.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useComments(42))

    await waitFor(() => expect(result.current.state.status).toBe('error'))
  })

  it('appends a live comment-added SSE event for the same business', async () => {
    mockList.mockResolvedValue([])
    const { result } = renderHook(() => useComments(42))

    await waitFor(() => expect(result.current.state.status).toBe('success'))

    act(() => {
      FakeEventSource.instances[0].emit('comment-added', COMMENT)
    })

    await waitFor(() => {
      if (result.current.state.status === 'success') {
        expect(result.current.state.data).toHaveLength(1)
      }
    })
  })

  it('ignores comment-added events for a different business', async () => {
    mockList.mockResolvedValue([])
    const { result } = renderHook(() => useComments(42))

    await waitFor(() => expect(result.current.state.status).toBe('success'))

    act(() => {
      FakeEventSource.instances[0].emit('comment-added', { ...COMMENT, businessId: 99 })
    })

    if (result.current.state.status === 'success') {
      expect(result.current.state.data).toHaveLength(0)
    }
  })

  it('createComment persists and appends to the thread', async () => {
    mockList.mockResolvedValue([])
    mockCreate.mockResolvedValue(COMMENT)
    const { result } = renderHook(() => useComments(42))

    await waitFor(() => expect(result.current.state.status).toBe('success'))

    await act(async () => {
      await result.current.createComment({ title: 'Seguimiento', detail: 'Falta el comprobante' })
    })

    if (result.current.state.status === 'success') {
      expect(result.current.state.data).toHaveLength(1)
    }
  })
})
