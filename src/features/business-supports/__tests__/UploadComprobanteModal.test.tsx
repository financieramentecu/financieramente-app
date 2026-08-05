import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../hooks/useUploadComprobante', () => ({
  useUploadComprobante: vi.fn(),
}))

vi.mock('@/features/shared/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { UploadComprobanteModal } from '../components/UploadComprobanteModal'
import { useUploadComprobante } from '../hooks/useUploadComprobante'

const mockUseUpload = vi.mocked(useUploadComprobante)

const makeIdleHook = (overrides = {}) => ({
  state: { status: 'idle' as const, data: undefined, error: '' as const },
  upload: vi.fn(),
  reset: vi.fn(),
  ...overrides,
})

describe('UploadComprobanteModal', () => {
  const defaultProps = {
    businessId: 42,
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpload.mockReturnValue(makeIdleHook())
  })

  it('renders the dialog when open=true', () => {
    render(<UploadComprobanteModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    render(<UploadComprobanteModal {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a file input', () => {
    render(<UploadComprobanteModal {...defaultProps} />)
    expect(screen.getByTestId('file-input')).toBeInTheDocument()
  })

  it('shows error message when state is error', () => {
    mockUseUpload.mockReturnValue(
      makeIdleHook({ state: { status: 'error', data: undefined, error: 'Tipo no permitido' } })
    )
    render(<UploadComprobanteModal {...defaultProps} />)
    expect(screen.getByText(/tipo no permitido/i)).toBeInTheDocument()
  })

  it('shows loading indicator when state is loading', () => {
    mockUseUpload.mockReturnValue(
      makeIdleHook({ state: { status: 'loading', data: undefined, error: '' } })
    )
    render(<UploadComprobanteModal {...defaultProps} />)
    expect(screen.getByText(/subiendo/i)).toBeInTheDocument()
  })

  it('file input accept attribute contains application/pdf', () => {
    render(<UploadComprobanteModal {...defaultProps} />)
    const input = screen.getByTestId('file-input')
    expect(input).toHaveAttribute('accept')
    expect(input.getAttribute('accept')).toContain('application/pdf')
  })

  it('shows success toast and calls onSuccess when upload succeeds', () => {
    const reset = vi.fn()
    mockUseUpload.mockReturnValue(
      makeIdleHook({
        state: { status: 'success', data: { id: 'supp-1' }, error: '' },
        reset,
      }),
    )

    render(<UploadComprobanteModal {...defaultProps} />)

    expect(toast.success).toHaveBeenCalledWith('Comprobante subido exitosamente')
    expect(defaultProps.onSuccess).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
    expect(reset).toHaveBeenCalled()
  })
})
