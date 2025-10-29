import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreateBusinessForm } from '../create-business-form'

describe('CreateBusinessForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with all fields', () => {
    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombres/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Apellidos/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/No. Documento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contacto/i)).toBeInTheDocument()
  })

  it('blocks all fields except documento when documento is empty', () => {
    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const emailInput = screen.getByLabelText(/Email/i)
    const nombresInput = screen.getByLabelText(/Nombres/i)
    const docInput = screen.getByLabelText(/No. Documento/i)

    expect(docInput).not.toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(nombresInput).toBeDisabled()
  })

  it('unlocks all fields when documento has value', async () => {
    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const docInput = screen.getByLabelText(/No. Documento/i) as HTMLInputElement
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement

    fireEvent.change(docInput, { target: { value: '12345' } })

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled()
    })
  })

  it('submit button is disabled when documento is empty', () => {
    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole('button', { name: /Aceptar y Guardar/i })
    expect(submitButton).toBeDisabled()
  })

  it('shows validation error for invalid email', async () => {
    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const docInput = screen.getByLabelText(/No. Documento/i) as HTMLInputElement
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement

    fireEvent.change(docInput, { target: { value: '12345' } })
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Aceptar y Guardar/i })
      expect(submitButton).not.toBeDisabled()
    })

    const submitButton = screen.getByRole('button', { name: /Aceptar y Guardar/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Email inválido/i)).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('submit button is enabled when documento has value', async () => {
    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const docInput = screen.getByLabelText(/No. Documento/i) as HTMLInputElement
    fireEvent.change(docInput, { target: { value: '12345' } })

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Aceptar y Guardar/i })
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('displays loading state during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <CreateBusinessForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const docInput = screen.getByLabelText(/No. Documento/i) as HTMLInputElement
    fireEvent.change(docInput, { target: { value: '12345' } })

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Aceptar y Guardar/i })
      expect(submitButton).not.toBeDisabled()
    })

    const submitButton = screen.getByRole('button', { name: /Aceptar y Guardar/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Guardando.../i)).toBeInTheDocument()
    })
  })
})

