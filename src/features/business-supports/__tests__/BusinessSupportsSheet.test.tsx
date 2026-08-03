import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('../hooks/useBusinessSupports', () => ({
  useBusinessSupports: vi.fn(),
}))

vi.mock('../hooks/useDeleteComprobante', () => ({
  useDeleteComprobante: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/features/shared/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div role="dialog" aria-label="comprobantes">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/features/shared/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode
    open?: boolean
  }) => (open ? <div role="alertdialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode
    onClick?: (e: React.MouseEvent) => void
    disabled?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    children,
    disabled,
  }: {
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
}))

import { ViewComprobantesSheet } from '../components/BusinessSupportsSheet'
import { useBusinessSupports } from '../hooks/useBusinessSupports'
import { useDeleteComprobante } from '../hooks/useDeleteComprobante'
import { toast } from 'sonner'

const mockUseBusinessSupports = vi.mocked(useBusinessSupports)
const mockUseDeleteComprobante = vi.mocked(useDeleteComprobante)

const mockComprobante = {
  id: 'cuid-1',
  businessId: 42,
  objectKey: 'negocios/42/abc.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 102400,
  uploadedBy: { id: 1, name: 'Ana García' },
  createdAt: '2026-05-14T10:00:00Z',
  viewUrl: 'https://cdn.example.com/abc.jpg',
}

const mockPdfComprobante = {
  id: 'cuid-2',
  businessId: 42,
  objectKey: 'negocios/42/doc.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 204800,
  uploadedBy: { id: 1, name: 'Ana García' },
  createdAt: '2026-05-14T11:00:00Z',
  viewUrl: 'https://cdn.example.com/doc.pdf',
}

const makeDeleteHook = (overrides = {}) => ({
  state: { status: 'idle' as const, data: undefined, error: '' as const },
  remove: vi.fn(),
  reset: vi.fn(),
  ...overrides,
})

describe('ViewComprobantesSheet', () => {
  const defaultProps = {
    businessId: 42,
    open: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDeleteComprobante.mockReturnValue(makeDeleteHook())
  })

  it('renders the sheet when open=true', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [], error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} />)
    expect(screen.getByRole('dialog', { name: /comprobantes/i })).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [], error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'loading', data: undefined, error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} />)
    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })

  it('shows empty state when no comprobantes', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [], error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} />)
    expect(screen.getByText(/sin comprobantes/i)).toBeInTheDocument()
  })

  it('renders comprobante thumbnails when data exists', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockComprobante], error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} />)
    // Should show the image via alt or thumbnail
    expect(screen.getByAltText(/comprobante/i)).toBeInTheDocument()
  })

  it('shows FileText icon (no img thumbnail) for PDF comprobante', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockPdfComprobante], error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} />)
    // No thumbnail img for the comprobante (alt matches /comprobante/i)
    expect(screen.queryByAltText(/comprobante/i)).not.toBeInTheDocument()
    // The FileText icon is rendered (via lucide svg with title or data-testid)
    // It renders as an SVG — we check it exists by querying role img or by the container
    const svgIcons = document.querySelectorAll('svg')
    expect(svgIcons.length).toBeGreaterThan(0)
  })

  it('renders iframe preview when PDF comprobante is selected', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockPdfComprobante], error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} />)
    const iframe = screen.getByTitle(/PDF/i)
    expect(iframe).toBeInTheDocument()
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', mockPdfComprobante.viewUrl)
  })

  it('renders img preview when image comprobante is selected', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockComprobante], error: '' },
      refetch: vi.fn(),
    })
    render(<ViewComprobantesSheet {...defaultProps} />)
    // Preview img with alt matching /preview/i
    expect(screen.getByAltText(/preview/i)).toBeInTheDocument()
    expect(screen.queryByTitle(/PDF/i)).not.toBeInTheDocument()
  })

  it('shows delete control for Money Strategist (AGENTE)', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockComprobante], error: '' },
      refetch: vi.fn(),
    })
    render(
      <ViewComprobantesSheet {...defaultProps} userRole={UserRole.AGENTE} />,
    )
    expect(
      screen.getByRole('button', { name: /eliminar comprobante/i }),
    ).toBeInTheDocument()
  })

  it('hides delete control when role cannot delete', () => {
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockComprobante], error: '' },
      refetch: vi.fn(),
    })
    render(
      <ViewComprobantesSheet {...defaultProps} userRole={UserRole.DEFAULT} />,
    )
    expect(
      screen.queryByRole('button', { name: /eliminar comprobante/i }),
    ).not.toBeInTheDocument()
  })

  it('asks for confirmation before deleting (CA1)', async () => {
    const user = userEvent.setup()
    const remove = vi.fn().mockResolvedValue(undefined)
    mockUseDeleteComprobante.mockReturnValue(makeDeleteHook({ remove }))
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockComprobante], error: '' },
      refetch: vi.fn(),
    })

    render(
      <ViewComprobantesSheet {...defaultProps} userRole={UserRole.AGENTE} />,
    )

    await user.click(
      screen.getByRole('button', { name: /eliminar comprobante/i }),
    )

    expect(
      screen.getByText('¿Está seguro de eliminar este comprobante?'),
    ).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }))
    expect(remove).toHaveBeenCalledWith('cuid-1')
  })

  it('shows toast error when delete fails (CA2)', async () => {
    const user = userEvent.setup()
    const remove = vi.fn().mockRejectedValue(new Error('Fallo de red'))
    mockUseDeleteComprobante.mockReturnValue(makeDeleteHook({ remove }))
    mockUseBusinessSupports.mockReturnValue({
      state: { status: 'success', data: [mockComprobante], error: '' },
      refetch: vi.fn(),
    })

    render(
      <ViewComprobantesSheet {...defaultProps} userRole={UserRole.AGENTE} />,
    )

    await user.click(
      screen.getByRole('button', { name: /eliminar comprobante/i }),
    )
    await user.click(screen.getByRole('button', { name: /^eliminar$/i }))

    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo completar la acción',
      expect.objectContaining({ description: 'Fallo de red' }),
    )
  })
})
