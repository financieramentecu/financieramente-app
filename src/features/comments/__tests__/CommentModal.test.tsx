import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/features/shared/hooks/use-auth-session', () => ({
  useAuthSession: vi.fn(),
}))

vi.mock('../lib/comments-api', () => ({
  commentsApi: {
    create: vi.fn(),
  },
}))

vi.mock('@/features/shared/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

import { CommentModal } from '../components/CommentModal'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { commentsApi } from '../lib/comments-api'

const mockUseAuthSession = vi.mocked(useAuthSession)
const mockCreate = vi.mocked(commentsApi.create)

const defaultProps = {
  businessId: 42,
  contract: 'CON-001',
  open: true,
  onClose: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuthSession.mockReturnValue({
    user: { name: 'Ana Agente', email: 'ana@example.com' },
  } as ReturnType<typeof useAuthSession>)
})

describe('CommentModal', () => {
  it('does not render when closed', () => {
    render(<CommentModal {...defaultProps} open={false} />)
    expect(screen.queryByText('Agregar comentario')).not.toBeInTheDocument()
  })

  it('renders locked fields from the current session and the contract prop', () => {
    render(<CommentModal {...defaultProps} />)
    expect(screen.getByText('Agregar comentario')).toBeInTheDocument()
    expect(screen.getByText('Ana Agente')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('CON-001')).toBeInTheDocument()
  })

  it('creates the comment and closes on submit', async () => {
    mockCreate.mockResolvedValue({
      id: 'c-1',
      businessId: 42,
      title: 'Seguimiento',
      detail: 'Falta el comprobante',
      author: { id: 1, name: 'Ana Agente', role: UserRole.AGENTE },
      createdAt: '2026-07-10T10:00:00.000Z',
    })
    const onClose = vi.fn()
    render(<CommentModal {...defaultProps} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Nombre del comentario'), {
      target: { value: 'Seguimiento' },
    })
    fireEvent.change(screen.getByLabelText('Detalle'), {
      target: { value: 'Falta el comprobante' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(42, {
        title: 'Seguimiento',
        detail: 'Falta el comprobante',
      })
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('discards the draft and closes on cancel without creating a comment', () => {
    const onClose = vi.fn()
    render(<CommentModal {...defaultProps} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Nombre del comentario'), {
      target: { value: 'Draft' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
