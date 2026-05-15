import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
})
