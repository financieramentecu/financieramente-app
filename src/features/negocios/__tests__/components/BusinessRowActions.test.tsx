import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BusinessRowActions } from '../../components/BusinessRowActions'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '../../types/business-entity.types'

vi.mock('@/features/shared/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div role="tooltip">{children}</div>,
}))

vi.mock('@/features/shared/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}))

vi.mock('@/features/comments/components/CommentModal', () => ({
  CommentModal: ({ open, businessId, contract }: { open: boolean; businessId: number; contract: string }) =>
    open ? (
      <div data-testid="comment-modal">
        Comment modal for {businessId} - {contract}
      </div>
    ) : null,
}))

const defaultProps = {
  businessId: 42,
  businessStatus: BUSINESS_STATUS.EMITIDO,
  contract: 'CON-001',
  userRole: UserRole.ADMIN,
  hasPayments: false,
  hasPendingPaymentFunding: false,
  onEdit: vi.fn(),
  onView: vi.fn(),
  onCancel: vi.fn(),
  onFondear: vi.fn(),
  onUploadComprobante: vi.fn(),
  onViewComprobantes: vi.fn(),
}

describe('BusinessRowActions', () => {
  describe('Upload button visibility', () => {
    it('shows upload button when status is EMITIDO and contract is not null', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.EMITIDO} contract="CON-001" />)
      expect(screen.getByRole('button', { name: /subir comprobante/i })).toBeInTheDocument()
    })

    it('shows upload button when status is FONDEADO and contract is not null', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.FONDEADO} contract="CON-001" />)
      expect(screen.getByRole('button', { name: /subir comprobante/i })).toBeInTheDocument()
    })

    it('hides upload button when status is VENTA_EFECTUADA', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA} contract="CON-001" />)
      expect(screen.queryByRole('button', { name: /subir comprobante/i })).not.toBeInTheDocument()
    })

    it('hides upload button when contract is null', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.EMITIDO} contract={null} />)
      expect(screen.queryByRole('button', { name: /subir comprobante/i })).not.toBeInTheDocument()
    })

    it('hides upload button when status is CANCELADO', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.CANCELADO} contract="CON-001" />)
      expect(screen.queryByRole('button', { name: /subir comprobante/i })).not.toBeInTheDocument()
    })
  })

  describe('View comprobantes button', () => {
    it('always shows the view comprobantes button', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.CANCELADO} contract={null} />)
      expect(screen.getByRole('button', { name: /ver comprobantes/i })).toBeInTheDocument()
    })

    it('shows view comprobantes button even when status is VENTA_EFECTUADA', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA} />)
      expect(screen.getByRole('button', { name: /ver comprobantes/i })).toBeInTheDocument()
    })
  })

  describe('Add comment action', () => {
    it('renders the "Agregar comentario" menu item', () => {
      render(<BusinessRowActions {...defaultProps} />)
      expect(screen.getByRole('button', { name: /agregar comentario/i })).toBeInTheDocument()
    })

    it('opens the comment modal with the row contract when clicked', () => {
      render(<BusinessRowActions {...defaultProps} contract="CON-001" />)
      expect(screen.queryByTestId('comment-modal')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /agregar comentario/i }))

      expect(screen.getByTestId('comment-modal')).toHaveTextContent('Comment modal for 42 - CON-001')
    })

    it('falls back to a business-id label when contract is null', () => {
      render(<BusinessRowActions {...defaultProps} contract={null} />)

      fireEvent.click(screen.getByRole('button', { name: /agregar comentario/i }))

      expect(screen.getByTestId('comment-modal')).toHaveTextContent('Comment modal for 42 - Negocio #42')
    })
  })

  describe('Novedad actions', () => {
    it('shows "Marcar Con Novedad" when status is VENTA_EFECTUADA and novedadStatus is null', () => {
      render(
        <BusinessRowActions
          {...defaultProps}
          businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA}
          novedadStatus={null}
          onMarkNovedad={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /marcar con novedad/i })).toBeInTheDocument()
    })

    it('hides "Marcar Con Novedad" when status is not VENTA_EFECTUADA', () => {
      render(
        <BusinessRowActions
          {...defaultProps}
          businessStatus={BUSINESS_STATUS.EMITIDO}
          novedadStatus={null}
          onMarkNovedad={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /marcar con novedad/i })).not.toBeInTheDocument()
    })

    it('hides "Marcar Con Novedad" when novedadStatus is already PENDIENTE', () => {
      render(
        <BusinessRowActions
          {...defaultProps}
          businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA}
          novedadStatus="PENDIENTE"
          onMarkNovedad={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /marcar con novedad/i })).not.toBeInTheDocument()
    })

    it('shows "Desmarcar Novedad" when novedadStatus is PENDIENTE', () => {
      render(
        <BusinessRowActions
          {...defaultProps}
          novedadStatus="PENDIENTE"
          onUnmarkNovedad={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /desmarcar novedad/i })).toBeInTheDocument()
    })

    it('hides "Desmarcar Novedad" when novedadStatus is null or RESUELTA', () => {
      const { rerender } = render(
        <BusinessRowActions {...defaultProps} novedadStatus={null} onUnmarkNovedad={vi.fn()} />
      )
      expect(screen.queryByRole('button', { name: /desmarcar novedad/i })).not.toBeInTheDocument()

      rerender(
        <BusinessRowActions {...defaultProps} novedadStatus="RESUELTA" onUnmarkNovedad={vi.fn()} />
      )
      expect(screen.queryByRole('button', { name: /desmarcar novedad/i })).not.toBeInTheDocument()
    })

    it('calls onMarkNovedad with businessId when clicked', () => {
      const onMarkNovedad = vi.fn()
      render(
        <BusinessRowActions
          {...defaultProps}
          businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA}
          novedadStatus={null}
          onMarkNovedad={onMarkNovedad}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /marcar con novedad/i }))
      expect(onMarkNovedad).toHaveBeenCalledWith(42)
    })

    it('calls onUnmarkNovedad with businessId when clicked', () => {
      const onUnmarkNovedad = vi.fn()
      render(
        <BusinessRowActions {...defaultProps} novedadStatus="PENDIENTE" onUnmarkNovedad={onUnmarkNovedad} />
      )
      fireEvent.click(screen.getByRole('button', { name: /desmarcar novedad/i }))
      expect(onUnmarkNovedad).toHaveBeenCalledWith(42)
    })

    it('does not render either novedad action when no novedad callbacks or gates match', () => {
      render(
        <BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.EMITIDO} novedadStatus={null} />
      )
      expect(screen.queryByRole('button', { name: /marcar con novedad/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /desmarcar novedad/i })).not.toBeInTheDocument()
    })
  })
})
