import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BusinessRowActions } from '../../components/BusinessRowActions'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '../../types/business-entity.types'
import type { BusinessNovedadStatus } from '../../types/business-entity.types'

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
  CommentModal: ({
    open,
    businessId,
    contract,
    onClose,
    onCreated,
  }: {
    open: boolean
    businessId: number
    contract: string
    onClose: () => void
    onCreated?: () => void
  }) =>
    open ? (
      <div data-testid="comment-modal">
        Comment modal for {businessId} - {contract}
        <button onClick={() => onCreated?.()}>Simulate comment created</button>
        <button onClick={onClose}>Simulate comment dialog dismissed</button>
      </div>
    ) : null,
}))

vi.mock('@/features/comments/components/CommentsHistoryModal', () => ({
  CommentsHistoryModal: ({
    open,
    businessId,
    contract,
    onClose,
    returnFocusRef,
  }: {
    open: boolean
    businessId: number
    contract: string | null
    onClose: () => void
    returnFocusRef?: React.RefObject<HTMLElement | null>
  }) =>
    open ? (
      <div
        data-testid="comments-history-modal"
        data-business-id={businessId}
        data-contract={contract === null ? 'null' : contract}
        data-has-return-focus-ref={String(returnFocusRef !== undefined)}
      >
        <button onClick={onClose}>Simulate history close</button>
        <button onClick={() => returnFocusRef?.current?.focus()}>Simulate focus return</button>
      </div>
    ) : null,
}))

vi.mock('@/features/business-supports/components/UploadComprobanteModal', () => ({
  UploadComprobanteModal: ({ open, businessId }: { open: boolean; businessId: number }) =>
    open ? <div data-testid="upload-comprobante-modal">Upload for {businessId}</div> : null,
}))

vi.mock('@/features/business-supports/components/BusinessSupportsSheet', () => ({
  ViewComprobantesSheet: ({ open, businessId }: { open: boolean; businessId: number }) =>
    open ? <div data-testid="view-comprobantes-sheet">Comprobantes for {businessId}</div> : null,
}))

vi.mock('../../components/modals/BusinessNovedadManageModal', () => ({
  BusinessNovedadManageModal: ({ open, business }: { open: boolean; business: { id: number } | null }) =>
    open ? <div data-testid="manage-novedad-modal">Manage novedad for {business?.id}</div> : null,
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

/** Names of every control rendered by a row, used to compare renders with and without the indicator */
function renderedControlNames(): string[] {
  return screen
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent ?? '')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BusinessRowActions', () => {
  describe('Comments indicator visibility', () => {
    it.each([1, 12, 145, 1000])('shows the exact count %i next to the icon', (count) => {
      render(<BusinessRowActions {...defaultProps} commentCount={count} />)

      const indicator = screen.getByRole('button', { name: `Ver comentarios (${count})` })
      expect(indicator.textContent).toBe(String(count))
      expect(indicator.querySelector('svg')).not.toBeNull()
    })

    it('shows the "Ver comentarios" tooltip text for the indicator', () => {
      render(<BusinessRowActions {...defaultProps} commentCount={3} />)

      expect(screen.getByText('Ver comentarios')).toBeInTheDocument()
    })

    it('places the indicator after "Ver comprobantes" and before "Más acciones"', () => {
      render(<BusinessRowActions {...defaultProps} commentCount={3} />)

      const names = renderedControlNames()
      const viewIndex = names.indexOf('Ver comprobantes')
      const indicatorIndex = names.indexOf('Ver comentarios (3)')
      const moreIndex = names.indexOf('Más acciones')
      expect(viewIndex).toBeGreaterThanOrEqual(0)
      expect(indicatorIndex).toBe(viewIndex + 1)
      expect(moreIndex).toBe(indicatorIndex + 1)
    })

    it.each([
      BUSINESS_STATUS.VENTA_EFECTUADA,
      BUSINESS_STATUS.EMITIDO,
      BUSINESS_STATUS.FONDEADO,
      BUSINESS_STATUS.LIQUIDADO,
      BUSINESS_STATUS.CANCELADO,
    ])('shows the indicator regardless of the %s business status', (status) => {
      render(<BusinessRowActions {...defaultProps} businessStatus={status} commentCount={2} />)

      expect(screen.getByRole('button', { name: 'Ver comentarios (2)' }).textContent).toBe('2')
    })

    it('opens the history modal from the keyboard with Enter and with Space', async () => {
      const user = userEvent.setup()
      render(<BusinessRowActions {...defaultProps} commentCount={4} />)
      const indicator = screen.getByRole('button', { name: 'Ver comentarios (4)' })

      indicator.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByTestId('comments-history-modal')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Simulate history close' }))
      expect(screen.queryByTestId('comments-history-modal')).not.toBeInTheDocument()

      indicator.focus()
      await user.keyboard(' ')
      expect(screen.getByTestId('comments-history-modal')).toBeInTheDocument()
    })

    // Guard tests: green on arrival because the indicator is hidden by design at zero or when missing
    it.each([0, undefined])('renders no indicator when commentCount is %s', (count) => {
      render(<BusinessRowActions {...defaultProps} commentCount={count} />)

      expect(screen.queryByRole('button', { name: /ver comentarios/i })).not.toBeInTheDocument()
      expect(screen.queryByText('0')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ver comprobantes' })).toBeInTheDocument()
    })

    it('adds no wrapper or spacer to the actions group at zero comments', () => {
      const { unmount } = render(<BusinessRowActions {...defaultProps} />)
      const groupWithoutProp = screen.getByRole('button', { name: 'Ver comprobantes' }).parentElement
      const childCountWithoutProp = groupWithoutProp?.children.length
      unmount()

      render(<BusinessRowActions {...defaultProps} commentCount={0} />)
      const groupAtZero = screen.getByRole('button', { name: 'Ver comprobantes' }).parentElement

      expect(childCountWithoutProp).toBeGreaterThan(0)
      expect(groupAtZero?.children.length).toBe(childCountWithoutProp)
    })
  })

  describe('Comments history modal', () => {
    it('does not mount the history modal nor open an EventSource while closed', () => {
      const eventSourceSpy = vi.fn()
      vi.stubGlobal('EventSource', eventSourceSpy)
      render(<BusinessRowActions {...defaultProps} commentCount={5} />)

      expect(screen.getByRole('button', { name: 'Ver comentarios (5)' })).toBeInTheDocument()
      expect(screen.queryByTestId('comments-history-modal')).not.toBeInTheDocument()
      expect(eventSourceSpy).not.toHaveBeenCalled()
    })

    it('mounts the history modal for the row business on click, with a focus-return ref', () => {
      render(<BusinessRowActions {...defaultProps} businessId={42} commentCount={5} />)

      fireEvent.click(screen.getByRole('button', { name: 'Ver comentarios (5)' }))

      const modal = screen.getByTestId('comments-history-modal')
      expect(modal).toHaveAttribute('data-business-id', '42')
      expect(modal).toHaveAttribute('data-has-return-focus-ref', 'true')
    })

    it('returns focus to the indicator through the ref passed to the modal', () => {
      render(<BusinessRowActions {...defaultProps} commentCount={5} />)
      const indicator = screen.getByRole('button', { name: 'Ver comentarios (5)' })

      fireEvent.click(indicator)
      expect(indicator).not.toHaveFocus()
      fireEvent.click(screen.getByRole('button', { name: 'Simulate focus return' }))

      expect(indicator).toHaveFocus()
    })

    it.each([
      { label: "the '-' placeholder", contract: '-', expected: 'null' },
      { label: 'a null contract', contract: null, expected: 'null' },
      { label: 'a real contract', contract: 'CT-2026-0042', expected: 'CT-2026-0042' },
    ])('passes $label to the history modal as $expected', ({ contract, expected }) => {
      render(<BusinessRowActions {...defaultProps} contract={contract} commentCount={5} />)

      fireEvent.click(screen.getByRole('button', { name: 'Ver comentarios (5)' }))

      expect(screen.getByTestId('comments-history-modal')).toHaveAttribute('data-contract', expected)
    })

    it("keeps the '-' label of the add-comment dialog unchanged", () => {
      render(<BusinessRowActions {...defaultProps} contract="-" commentCount={5} />)

      fireEvent.click(screen.getByRole('button', { name: /agregar comentario/i }))

      expect(screen.getByTestId('comment-modal')).toHaveTextContent('Comment modal for 42 - -')
      expect(screen.queryByTestId('comments-history-modal')).not.toBeInTheDocument()
    })

    it('mounts only the history modal of the row that was clicked', () => {
      render(
        <>
          <BusinessRowActions {...defaultProps} businessId={1} commentCount={3} />
          <BusinessRowActions {...defaultProps} businessId={2} commentCount={8} />
        </>
      )

      fireEvent.click(screen.getByRole('button', { name: 'Ver comentarios (8)' }))

      const modals = screen.getAllByTestId('comments-history-modal')
      expect(modals).toHaveLength(1)
      expect(modals[0]).toHaveAttribute('data-business-id', '2')
    })

    it('does not change the badge count while the modal is open (no live row update)', () => {
      render(<BusinessRowActions {...defaultProps} commentCount={3} />)

      fireEvent.click(screen.getByRole('button', { name: 'Ver comentarios (3)' }))

      expect(screen.getByTestId('comments-history-modal')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ver comentarios (3)' }).textContent).toBe('3')
    })

    it('unmounts the history modal on close and then mounts only the comprobantes sheet', () => {
      render(<BusinessRowActions {...defaultProps} commentCount={3} />)

      fireEvent.click(screen.getByRole('button', { name: 'Ver comentarios (3)' }))
      fireEvent.click(screen.getByRole('button', { name: 'Simulate history close' }))
      expect(screen.queryByTestId('comments-history-modal')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Ver comprobantes' }))

      expect(screen.getByTestId('view-comprobantes-sheet')).toHaveTextContent('Comprobantes for 42')
      expect(screen.queryByTestId('comments-history-modal')).not.toBeInTheDocument()
    })
  })

  // Guard tests: green on arrival because the indicator intentionally has no role or status gate
  describe('Comments indicator roles and non-regression', () => {
    it('shows the indicator to a read-only CONSULTOR, opens the history, and offers no add-comment item', () => {
      render(<BusinessRowActions {...defaultProps} userRole={UserRole.CONSULTOR} commentCount={7} />)

      expect(screen.queryByRole('button', { name: /agregar comentario/i })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Ver comentarios (7)' }))

      expect(screen.getByTestId('comments-history-modal')).toBeInTheDocument()
    })

    it('shows the indicator for every real UserRole and when the role is not provided', () => {
      const roles = [...Object.values(UserRole), undefined]
      expect(roles.length).toBeGreaterThan(2)

      for (const role of roles) {
        const { unmount } = render(<BusinessRowActions {...defaultProps} userRole={role} commentCount={6} />)
        expect(screen.getByRole('button', { name: 'Ver comentarios (6)' }).textContent).toBe('6')
        unmount()
      }
    })

    it('keeps the existing actions and their handlers when the indicator is present', () => {
      const onUploadComprobante = vi.fn()
      const onViewComprobantes = vi.fn()
      const onView = vi.fn()
      render(
        <BusinessRowActions
          {...defaultProps}
          commentCount={5}
          onUploadComprobante={onUploadComprobante}
          onViewComprobantes={onViewComprobantes}
          onView={onView}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Subir comprobante' }))
      fireEvent.click(screen.getByRole('button', { name: 'Ver comprobantes' }))
      fireEvent.click(screen.getByRole('button', { name: /ver detalle/i }))

      expect(onUploadComprobante).toHaveBeenCalledWith(42)
      expect(onViewComprobantes).toHaveBeenCalledWith(42)
      expect(onView).toHaveBeenCalledWith(42)
      expect(screen.getByRole('button', { name: 'Más acciones' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /agregar comentario/i })).toBeInTheDocument()
    })

    it('renders the same controls at zero comments as when the prop is omitted', () => {
      const { unmount } = render(<BusinessRowActions {...defaultProps} />)
      const withoutProp = renderedControlNames()
      unmount()

      render(<BusinessRowActions {...defaultProps} commentCount={0} />)

      expect(withoutProp).toContain('Ver comprobantes')
      expect(renderedControlNames()).toEqual(withoutProp)
    })
  })

  describe('Comment creation refresh', () => {
    it('opens the add-comment dialog with its existing label, separate from the history modal', () => {
      render(<BusinessRowActions {...defaultProps} contract="CON-001" commentCount={2} />)

      fireEvent.click(screen.getByRole('button', { name: /agregar comentario/i }))

      expect(screen.getByTestId('comment-modal')).toHaveTextContent('Comment modal for 42 - CON-001')
      expect(screen.queryByTestId('comments-history-modal')).not.toBeInTheDocument()
    })

    it('calls onCommentCreated exactly once after a comment is created', () => {
      const onCommentCreated = vi.fn()
      render(<BusinessRowActions {...defaultProps} onCommentCreated={onCommentCreated} />)

      fireEvent.click(screen.getByRole('button', { name: /agregar comentario/i }))
      expect(onCommentCreated).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Simulate comment created' }))

      expect(onCommentCreated).toHaveBeenCalledTimes(1)
    })

    it('does not call onCommentCreated when the add-comment dialog is dismissed', () => {
      const onCommentCreated = vi.fn()
      render(<BusinessRowActions {...defaultProps} onCommentCreated={onCommentCreated} />)

      fireEvent.click(screen.getByRole('button', { name: /agregar comentario/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Simulate comment dialog dismissed' }))

      expect(screen.queryByTestId('comment-modal')).not.toBeInTheDocument()
      expect(onCommentCreated).not.toHaveBeenCalled()
    })
  })

  describe('Upload button visibility', () => {
    it('shows upload button when status is EMITIDO and contract is not null', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.EMITIDO} contract="CON-001" />)
      expect(screen.getByRole('button', { name: /subir comprobante/i })).toBeInTheDocument()
    })

    it('shows upload button when status is FONDEADO and contract is not null', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.FONDEADO} contract="CON-001" />)
      expect(screen.getByRole('button', { name: /subir comprobante/i })).toBeInTheDocument()
    })

    it('shows upload button when status is VENTA_EFECTUADA with contract', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA} contract="CON-001" />)
      expect(screen.getByRole('button', { name: /subir comprobante/i })).toBeInTheDocument()
    })

    it('shows upload button when status is VENTA_EFECTUADA without contract', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.VENTA_EFECTUADA} contract={null} />)
      expect(screen.getByRole('button', { name: /subir comprobante/i })).toBeInTheDocument()
    })

    it('shows upload button when status is EMITIDO and contract is null', () => {
      render(<BusinessRowActions {...defaultProps} businessStatus={BUSINESS_STATUS.EMITIDO} contract={null} />)
      expect(screen.getByRole('button', { name: /subir comprobante/i })).toBeInTheDocument()
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

    it('shows "Desmarcar Novedad" when novedadStatus is NUEVA', () => {
      render(
        <BusinessRowActions
          {...defaultProps}
          novedadStatus="NUEVA"
          onUnmarkNovedad={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /desmarcar novedad/i })).toBeInTheDocument()
    })

    it('hides "Desmarcar Novedad" when novedadStatus is null or a backoffice-managed status (e.g. PENDIENTE)', () => {
      const { rerender } = render(
        <BusinessRowActions {...defaultProps} novedadStatus={null} onUnmarkNovedad={vi.fn()} />
      )
      expect(screen.queryByRole('button', { name: /desmarcar novedad/i })).not.toBeInTheDocument()

      rerender(
        <BusinessRowActions {...defaultProps} novedadStatus="PENDIENTE" onUnmarkNovedad={vi.fn()} />
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
        <BusinessRowActions {...defaultProps} novedadStatus="NUEVA" onUnmarkNovedad={onUnmarkNovedad} />
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

  describe('Read-only role (CONSULTOR)', () => {
    const readOnlyProps = {
      ...defaultProps,
      userRole: UserRole.CONSULTOR,
      businessStatus: BUSINESS_STATUS.VENTA_EFECTUADA,
      novedadStatus: null as BusinessNovedadStatus | null,
      onMarkNovedad: vi.fn(),
      onUnmarkNovedad: vi.fn(),
    }

    it('hides the upload comprobante button', () => {
      render(<BusinessRowActions {...readOnlyProps} contract="CON-001" />)
      expect(
        screen.queryByRole('button', { name: /subir comprobante/i })
      ).not.toBeInTheDocument()
    })

    it('still shows the view comprobantes button (read action)', () => {
      render(<BusinessRowActions {...readOnlyProps} />)
      expect(
        screen.getByRole('button', { name: /ver comprobantes/i })
      ).toBeInTheDocument()
    })

    it('hides the "Editar" menu item', () => {
      render(<BusinessRowActions {...readOnlyProps} />)
      expect(
        screen.queryByRole('button', { name: /^editar$/i })
      ).not.toBeInTheDocument()
    })

    it('still shows "Ver detalle" (read action)', () => {
      render(<BusinessRowActions {...readOnlyProps} />)
      expect(
        screen.getByRole('button', { name: /ver detalle/i })
      ).toBeInTheDocument()
    })

    it('hides "Agregar comentario"', () => {
      render(<BusinessRowActions {...readOnlyProps} />)
      expect(
        screen.queryByRole('button', { name: /agregar comentario/i })
      ).not.toBeInTheDocument()
    })

    it('hides "Marcar Con Novedad" even when status/novedad gates match', () => {
      render(<BusinessRowActions {...readOnlyProps} />)
      expect(
        screen.queryByRole('button', { name: /marcar con novedad/i })
      ).not.toBeInTheDocument()
    })

    it('hides "Desmarcar Novedad" even when novedadStatus is NUEVA', () => {
      render(<BusinessRowActions {...readOnlyProps} novedadStatus="NUEVA" />)
      expect(
        screen.queryByRole('button', { name: /desmarcar novedad/i })
      ).not.toBeInTheDocument()
    })

    it('hides "Eliminar" (cancel) menu item', () => {
      render(<BusinessRowActions {...readOnlyProps} />)
      expect(
        screen.queryByRole('button', { name: /eliminar/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Gestionar Novedad action', () => {
    it('shows "Gestionar Novedad" for ADMIN when the business has a novedad marked', () => {
      render(
        <BusinessRowActions {...defaultProps} userRole={UserRole.ADMIN} novedadStatus="NUEVA" />
      )
      expect(screen.getByRole('button', { name: /gestionar novedad/i })).toBeInTheDocument()
    })

    it('shows "Gestionar Novedad" for ANALISTA_SOPORTE', () => {
      render(
        <BusinessRowActions
          {...defaultProps}
          userRole={UserRole.ANALISTA_SOPORTE}
          novedadStatus="SOMETIDA_DEVOLUCION"
        />
      )
      expect(screen.getByRole('button', { name: /gestionar novedad/i })).toBeInTheDocument()
    })

    it('hides "Gestionar Novedad" for AGENTE (unauthorized role)', () => {
      render(
        <BusinessRowActions {...defaultProps} userRole={UserRole.AGENTE} novedadStatus="NUEVA" />
      )
      expect(screen.queryByRole('button', { name: /gestionar novedad/i })).not.toBeInTheDocument()
    })

    it('hides "Gestionar Novedad" when the business has no novedad marked', () => {
      render(
        <BusinessRowActions {...defaultProps} userRole={UserRole.ADMIN} novedadStatus={null} />
      )
      expect(screen.queryByRole('button', { name: /gestionar novedad/i })).not.toBeInTheDocument()
    })

    it('opens the manage novedad modal when clicked', () => {
      render(
        <BusinessRowActions {...defaultProps} userRole={UserRole.ADMIN} novedadStatus="DECLINADA" />
      )
      expect(screen.queryByTestId('manage-novedad-modal')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /gestionar novedad/i }))

      expect(screen.getByTestId('manage-novedad-modal')).toHaveTextContent('Manage novedad for 42')
    })
  })
})
