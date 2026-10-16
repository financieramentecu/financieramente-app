import { render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { ROLE_NAMES, UserRole } from '@/features/auth/lib/roles'
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

/** Intl may emit U+00A0 / U+202F between date parts; normalize to a plain space. */
function normalize(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ')
}

// 2026-09-30T02:30:00Z is 2026-09-29 21:30 in Bogotá (UTC-5)
const BOGOTA_INSTANT = '2026-09-30T02:30:00.000Z'
// CLDR versions differ: es-CO "medium" is "29/09/2026" or "29 sept 2026"
const BOGOTA_DATE = /29(\/09\/| sept?\.? )2026/
const BOGOTA_TIME = /9:30\s?p\.\s?m\./

describe('CommentItem', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

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
  it.each(['UTC', 'Asia/Tokyo'])(
    'shows the comment date and time in Bogota time when the runtime timezone is %s',
    (timeZone) => {
      vi.stubEnv('TZ', timeZone)
      render(<CommentItem comment={{ ...baseComment, createdAt: BOGOTA_INSTANT }} />)

      const timestamp = normalize(screen.getByTestId('comment-item-c-1').textContent ?? '')
      expect(timestamp).toMatch(BOGOTA_DATE)
      expect(timestamp).toMatch(BOGOTA_TIME)
    },
  )

  it('guard: keeps author, role label, title, link and line breaks of the content', () => {
    render(
      <CommentItem
        comment={{
          ...baseComment,
          detail: 'Primera línea\nVer https://docs.example.com/guia',
        }}
      />,
    )

    expect(screen.getByText('Ana Agente')).toBeInTheDocument()
    expect(screen.getByText(ROLE_NAMES[UserRole.AGENTE])).toBeInTheDocument()
    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://docs.example.com/guia' })).toHaveAttribute(
      'href',
      'https://docs.example.com/guia',
    )
    expect(screen.getByText(/Primera línea/).textContent).toContain('Primera línea\nVer ')
  })
})
