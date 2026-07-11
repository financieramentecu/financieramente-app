import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CommentInput } from '../components/CommentInput'

const defaultProps = {
  authorName: 'Ana Agente',
  authorEmail: 'ana@example.com',
  contract: 'CTR-001',
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
}

describe('CommentInput', () => {
  it('renders the locked fields (name, email, contract)', () => {
    render(<CommentInput {...defaultProps} />)
    expect(screen.getByText('Ana Agente')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText('CTR-001')).toBeInTheDocument()
  })

  it('shows live character counters', () => {
    render(<CommentInput {...defaultProps} />)
    fireEvent.change(screen.getByLabelText('Nombre del comentario'), {
      target: { value: 'Seguimiento' },
    })
    expect(screen.getByText('11/40')).toBeInTheDocument()
  })

  it('blocks input beyond the max length', () => {
    render(<CommentInput {...defaultProps} />)
    const input = screen.getByLabelText('Nombre del comentario') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'a'.repeat(50) } })
    expect(input.value).toHaveLength(40)
  })

  it('shows validation errors and does not call onSubmit when fields are empty', async () => {
    const onSubmit = vi.fn()
    render(<CommentInput {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(screen.getByText('El nombre del comentario es obligatorio')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with valid title/detail and clears the form', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CommentInput {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Nombre del comentario'), {
      target: { value: 'Seguimiento' },
    })
    fireEvent.change(screen.getByLabelText('Detalle'), {
      target: { value: 'Falta el comprobante de pago' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Seguimiento',
        detail: 'Falta el comprobante de pago',
      })
    })
  })

  it('calls onCancel and clears the draft', () => {
    const onCancel = vi.fn()
    render(<CommentInput {...defaultProps} onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText('Nombre del comentario'), {
      target: { value: 'Draft' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect((screen.getByLabelText('Nombre del comentario') as HTMLInputElement).value).toBe('')
  })
})
