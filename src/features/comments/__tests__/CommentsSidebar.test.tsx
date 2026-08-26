import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('../hooks/use-comments', () => ({
  useComments: vi.fn(),
}))

vi.mock('@/features/shared/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="sheet-root" data-open={open}>
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

import { CommentsSidebar } from '../components/CommentsSidebar'
import { useComments } from '../hooks/use-comments'

const mockUseComments = vi.mocked(useComments)

const COMMENT = {
  id: 'c-1',
  businessId: 10,
  title: 'Seguimiento',
  detail: 'Falta el comprobante',
  author: { id: 1, name: 'Ana Agente', role: UserRole.AGENTE },
  createdAt: '2026-07-01T10:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseComments.mockReturnValue({
    state: { status: 'success', data: [COMMENT], error: '' },
    refetch: vi.fn(),
    createComment: vi.fn(),
  })
})

const defaultProps = {
  businessId: 10,
  authorName: 'Ana Agente',
  authorEmail: 'ana@example.com',
  contract: 'CTR-001',
}

describe('CommentsSidebar', () => {
  it('renders the trigger button', () => {
    render(<CommentsSidebar {...defaultProps} />)
    expect(screen.getByRole('button', { name: /comentarios/i })).toBeInTheDocument()
  })

  it('auto-opens and calls onAutoOpen when defaultOpen=true', () => {
    const onAutoOpen = vi.fn()
    render(<CommentsSidebar {...defaultProps} defaultOpen onAutoOpen={onAutoOpen} />)
    expect(onAutoOpen).toHaveBeenCalledOnce()
    expect(screen.getByTestId('sheet-root')).toHaveAttribute('data-open', 'true')
  })

  it('does not auto-open by default', () => {
    render(<CommentsSidebar {...defaultProps} />)
    expect(screen.getByTestId('sheet-root')).toHaveAttribute('data-open', 'false')
  })

  it('renders the thread once comments load', () => {
    render(<CommentsSidebar {...defaultProps} defaultOpen />)
    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
  })

  it('shows the add-comment form by default', () => {
    render(<CommentsSidebar {...defaultProps} defaultOpen />)
    expect(
      screen.getByPlaceholderText(/escribí el detalle del comentario/i)
    ).toBeInTheDocument()
  })

  it('hides the add-comment form when readOnly (CONSULTOR)', () => {
    render(<CommentsSidebar {...defaultProps} defaultOpen readOnly />)
    expect(
      screen.queryByPlaceholderText(/escribí el detalle del comentario/i)
    ).not.toBeInTheDocument()
    // The thread stays visible — read-only means no writes, not no visibility
    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
  })
})
