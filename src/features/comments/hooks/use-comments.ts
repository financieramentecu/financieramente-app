'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { CommentDTO, CreateCommentInput } from '../types/comment.types'
import { commentsApi } from '../lib/comments-api'

interface UseCommentsReturn {
  state: AsyncState<CommentDTO[]>
  refetch: () => Promise<void>
  createComment: (input: CreateCommentInput) => Promise<CommentDTO>
}

/**
 * Fetches the comment thread for a negocio and appends new comments live via the
 * shared SSE connection (`comment-added` event, piggybacked on the same
 * EventSource used for notifications). Degrades gracefully — if the listener
 * never fires, the thread still updates on manual `refetch()`.
 */
export function useComments(businessId: number): UseCommentsReturn {
  const [state, setState] = useState<AsyncState<CommentDTO[]>>({
    status: 'loading',
    data: undefined,
    error: '',
  })

  const fetch = useCallback(async () => {
    setState({ status: 'loading', data: undefined, error: '' })
    try {
      const comments = await commentsApi.list(businessId)
      setState({ status: 'success', data: comments, error: '' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar comentarios'
      setState({ status: 'error', data: undefined, error: message })
    }
  }, [businessId])

  useEffect(() => {
    void fetch()

    const eventSource = new EventSource('/api/notifications/stream')

    eventSource.addEventListener('comment-added', (e) => {
      try {
        const newComment: CommentDTO = JSON.parse(e.data)
        if (newComment.businessId !== businessId) return
        setState((prev) => {
          if (prev.status !== 'success') return prev
          if (prev.data.some((c) => c.id === newComment.id)) return prev
          return { status: 'success', data: [...prev.data, newComment], error: '' }
        })
      } catch {
        console.error('Error parsing SSE comment-added event:', e.data)
      }
    })

    eventSource.onerror = () => {
      // Browser auto-reconnects; refetch() remains available as a manual fallback.
    }

    return () => {
      eventSource.close()
    }
  }, [businessId, fetch])

  const createComment = useCallback(
    async (input: CreateCommentInput) => {
      const created = await commentsApi.create(businessId, input)
      setState((prev) => {
        if (prev.status !== 'success') return { status: 'success', data: [created], error: '' }
        return { status: 'success', data: [...prev.data, created], error: '' }
      })
      return created
    },
    [businessId],
  )

  return { state, refetch: fetch, createComment }
}
