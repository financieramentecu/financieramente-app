import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../hooks/useBusinessSupports', () => ({
  useBusinessSupports: vi.fn(),
}))

vi.mock('../hooks/useDeleteComprobante', () => ({
  useDeleteComprobante: vi.fn(),
}))

vi.mock('@/features/shared/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div role="dialog" aria-label="comprobantes">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

import { ViewComprobantesSheet } from '../components/BusinessSupportsSheet'
import { useBusinessSupports } from '../hooks/useBusinessSupports'
import { useDeleteComprobante } from '../hooks/useDeleteComprobante'

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
})
