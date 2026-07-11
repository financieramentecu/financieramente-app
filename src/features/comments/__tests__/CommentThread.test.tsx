import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { CommentThread } from '../components/CommentThread'
import type { CommentDTO } from '../types/comment.types'

const AGENTE_COMMENT: CommentDTO = {
  id: 'c-1',
  businessId: 10,
  title: 'Seguimiento',
  detail: 'Falta el comprobante',
  author: { id: 1, name: 'Ana Agente', role: UserRole.AGENTE },
  createdAt: '2026-07-01T10:00:00.000Z',
}

const ANALISTA_COMMENT: CommentDTO = {
  id: 'c-2',
  businessId: 10,
  title: 'Respuesta',
  detail: 'Ya lo subo',
  author: { id: 2, name: 'Beto Analista', role: UserRole.ANALISTA_SOPORTE },
  createdAt: '2026-07-01T11:00:00.000Z',
}

describe('CommentThread', () => {
  it('shows an empty-state message when there are no comments', () => {
    render(<CommentThread comments={[]} />)
    expect(screen.getByText('Todavía no hay comentarios en este contrato.')).toBeInTheDocument()
  })

  it('renders comments in oldest -> newest DOM order', () => {
    render(<CommentThread comments={[AGENTE_COMMENT, ANALISTA_COMMENT]} />)
    const items = screen.getAllByTestId(/comment-item-/)
    expect(items[0]).toHaveAttribute('data-testid', 'comment-item-c-1')
    expect(items[1]).toHaveAttribute('data-testid', 'comment-item-c-2')
  })

  it('aligns AGENTE comments left and ANALISTA_SOPORTE comments right', () => {
    render(<CommentThread comments={[AGENTE_COMMENT, ANALISTA_COMMENT]} />)
    expect(screen.getByTestId('comment-item-c-1')).toHaveClass('justify-start')
    expect(screen.getByTestId('comment-item-c-2')).toHaveClass('justify-end')
  })

  it('highlights the focused comment', () => {
    render(<CommentThread comments={[AGENTE_COMMENT]} focusedCommentId="c-1" />)
    expect(screen.getByTestId('comment-item-c-1').firstElementChild).toHaveClass('ring-2')
  })
})
