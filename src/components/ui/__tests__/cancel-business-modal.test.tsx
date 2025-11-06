import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CancelBusinessModal } from '../cancel-business-modal'

describe('CancelBusinessModal', () => {
  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with business ID', () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('Cancelar negocio #12345')).toBeInTheDocument()
  })

  it('renders warning message', () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    expect(
      screen.getByText(/Esta acción es irreversible/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/El negocio pasará a estado Cancelado/)
    ).toBeInTheDocument()
  })

  it('renders explanation field with required indicator', () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    expect(
      screen.getByText(/Explicación del motivo por el cual se cancelara el negocio/)
    ).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders confirmation question', () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    expect(
      screen.getByText('¿Esta seguro de cancelar el negocio?')
    ).toBeInTheDocument()
  })

  it('renders cancel and confirm buttons', () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByRole('button', { name: /Cancelar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument()
  })

  it('disables confirm button when reason is empty', () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
    expect(confirmButton).toBeDisabled()
  })

  it('enables confirm button when reason is filled', async () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    const textarea = screen.getByPlaceholderText(/Describe el motivo/)
    fireEvent.change(textarea, { target: { value: 'Test reason' } })

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
      expect(confirmButton).not.toBeDisabled()
    })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Cancelar/ })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onConfirm with reason when confirm button is clicked', async () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    const textarea = screen.getByPlaceholderText(/Describe el motivo/)
    fireEvent.change(textarea, { target: { value: 'Test cancellation reason' } })

    const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('Test cancellation reason')
    })
  })

  it('closes modal after successful confirmation', async () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
      />
    )

    const textarea = screen.getByPlaceholderText(/Describe el motivo/)
    fireEvent.change(textarea, { target: { value: 'Test reason' } })

    const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('clears reason when cancel button is clicked', async () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        businessId="12345"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const textarea = screen.getByPlaceholderText(/Describe el motivo/) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Test reason' } })

    const cancelButton = screen.getByRole('button', { name: /Cancelar/ })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('uses default business ID when not provided', () => {
    render(
      <CancelBusinessModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('Cancelar negocio #xxxxx')).toBeInTheDocument()
  })
})

