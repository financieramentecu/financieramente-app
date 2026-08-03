import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { CommentItem } from '../components/CommentItem'
import type { CommentDTO } from '../types/comment.types'

const baseComment: CommentDTO = {
  id: 'c-1',
  businessId: 10,
  title: 'Seguimiento',
  detail: 'Falta el comprobante',
  author: { id: 1, name: 'Ana Agente', role: UserRole.AGENTE },
  createdAt: '2026-07-01T10:00:00.000Z',
}

describe('CommentItem', () => {
  it('renders title and detail as plain text when there are no urls', () => {
    render(<CommentItem comment={baseComment} />)
    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
    expect(screen.getByText('Falta el comprobante')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders https urls in detail as clickable links opening in a new tab (CA1, CA2)', () => {
    render(
      <CommentItem
        comment={{
          ...baseComment,
          detail: 'Ver https://docs.example.com/guia',
        }}
      />,
    )

    const link = screen.getByRole('link', { name: 'https://docs.example.com/guia' })
    expect(link).toHaveAttribute('href', 'https://docs.example.com/guia')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveClass('underline')
  })

  it('renders www urls with https href', () => {
    render(
      <CommentItem
        comment={{
          ...baseComment,
          detail: 'Mira www.example.com/path',
        }}
      />,
    )

    const link = screen.getByRole('link', { name: 'www.example.com/path' })
    expect(link).toHaveAttribute('href', 'https://www.example.com/path')
  })

  it('linkifies only url fragments inside mixed text with multiple links (CA3)', () => {
    render(
      <CommentItem
        comment={{
          ...baseComment,
          detail:
            'Revisar este doc: https://docs.example.com/a y también este www.example.com/b',
        }}
      />,
    )

    expect(screen.getByText(/Revisar este doc:/)).toBeInTheDocument()
    expect(screen.getByText(/y también este/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://docs.example.com/a' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'www.example.com/b' })).toBeInTheDocument()
  })

  it('also linkifies urls in the title', () => {
    render(
      <CommentItem
        comment={{
          ...baseComment,
          title: 'Doc https://example.com/t',
        }}
      />,
    )

    expect(screen.getByRole('link', { name: 'https://example.com/t' })).toHaveAttribute(
      'target',
      '_blank',
    )
  })
})
