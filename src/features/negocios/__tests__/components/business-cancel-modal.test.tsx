import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BusinessCancelModal } from '../../components/modals/BusinessCancelModal'
import { createMockBusiness } from '../fixtures/mock-business'

describe('BusinessCancelModal', () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		business: createMockBusiness({ status: 'VENTA_EFECTUADA' }),
		onConfirm: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Happy Path - Escenario 11: Inicio del proceso de cancelación', () => {
		it('should show modal title with business ID', () => {
			render(<BusinessCancelModal {...defaultProps} />)

			expect(screen.getByText(/Cancelar Negocio #1/)).toBeInTheDocument()
		})

		it('should show warning message', () => {
			render(<BusinessCancelModal {...defaultProps} />)

			expect(
				screen.getByText(/Esta acción es irreversible/)
			).toBeInTheDocument()
			expect(screen.getByText(/pasará a estado Cancelado/)).toBeInTheDocument()
		})

		it('should show business basic info', () => {
			render(<BusinessCancelModal {...defaultProps} />)

			expect(screen.getByText('María García López')).toBeInTheDocument()
			expect(screen.getByText('Crédito Personal')).toBeInTheDocument()
			expect(screen.getByText('1234567890')).toBeInTheDocument()
		})

		it('should show character counter starting at 0', () => {
			render(<BusinessCancelModal {...defaultProps} />)

			expect(screen.getByText('0/500')).toBeInTheDocument()
		})

		it('should have confirm button disabled initially', () => {
			render(<BusinessCancelModal {...defaultProps} />)

			expect(
				screen.getByRole('button', { name: /Confirmar Cancelación/i })
			).toBeDisabled()
		})

		it('should show status badge', () => {
			render(<BusinessCancelModal {...defaultProps} />)

			expect(screen.getByText('Venta Efectuada')).toBeInTheDocument()
		})
	})

	describe('Happy Path - Escenario 12: Cancelación exitosa', () => {
		it('should enable confirm button when reason has 20+ characters', async () => {
			const user = userEvent.setup()
			render(<BusinessCancelModal {...defaultProps} />)

			const textarea = screen.getByPlaceholderText(/motivo detallado/i)
			await user.type(
				textarea,
				'Cliente solicitó cancelación por cambio de planes'
			)

			expect(
				screen.getByRole('button', { name: /Confirmar Cancelación/i })
			).not.toBeDisabled()
		})

		it('should call onConfirm with reason when confirmed', async () => {
			const user = userEvent.setup()
			const onConfirm = vi.fn()
			render(<BusinessCancelModal {...defaultProps} onConfirm={onConfirm} />)

			const reason = 'Cliente solicitó cancelación por cambio de aseguradora'
			await user.type(screen.getByPlaceholderText(/motivo/i), reason)
			await user.click(
				screen.getByRole('button', { name: /Confirmar Cancelación/i })
			)

			expect(onConfirm).toHaveBeenCalledWith(reason)
		})

		it('should update character counter as user types', async () => {
			const user = userEvent.setup()
			render(<BusinessCancelModal {...defaultProps} />)

			const textarea = screen.getByPlaceholderText(/motivo/i)
			await user.type(textarea, 'Test reason')

			expect(screen.getByText('11/500')).toBeInTheDocument()
		})

		it('should close modal after successful confirm', async () => {
			const user = userEvent.setup()
			const onOpenChange = vi.fn()
			const onConfirm = vi.fn().mockResolvedValue(undefined)

			render(
				<BusinessCancelModal
					{...defaultProps}
					onOpenChange={onOpenChange}
					onConfirm={onConfirm}
				/>
			)

			await user.type(
				screen.getByPlaceholderText(/motivo/i),
				'Cliente cambió de opinión sobre el producto'
			)
			await user.click(
				screen.getByRole('button', { name: /Confirmar Cancelación/i })
			)

			await waitFor(() => {
				expect(onOpenChange).toHaveBeenCalledWith(false)
			})
		})
	})

	describe('Flujos Alternos - Escenario 13: Cancelación del proceso', () => {
		it('should close modal when cancel button clicked', async () => {
			const user = userEvent.setup()
			const onOpenChange = vi.fn()
			render(
				<BusinessCancelModal {...defaultProps} onOpenChange={onOpenChange} />
			)

			await user.click(screen.getByRole('button', { name: /^Cancelar$/i }))

			expect(onOpenChange).toHaveBeenCalledWith(false)
		})

		it('should NOT call onConfirm when cancelled', async () => {
			const user = userEvent.setup()
			const onConfirm = vi.fn()
			render(<BusinessCancelModal {...defaultProps} onConfirm={onConfirm} />)

			// Escribir motivo pero cancelar
			await user.type(
				screen.getByPlaceholderText(/motivo/i),
				'Some reason here that is long enough'
			)
			await user.click(screen.getByRole('button', { name: /^Cancelar$/i }))

			expect(onConfirm).not.toHaveBeenCalled()
		})

		it('should reset reason when modal is closed', async () => {
			const { rerender } = render(<BusinessCancelModal {...defaultProps} />)

			// Type something
			const textarea = screen.getByPlaceholderText(/motivo/i)
			fireEvent.change(textarea, { target: { value: 'Some reason text' } })

			// Close and reopen modal
			rerender(<BusinessCancelModal {...defaultProps} open={false} />)
			rerender(<BusinessCancelModal {...defaultProps} open={true} />)

			// Reason should be reset
			const newTextarea = screen.getByPlaceholderText(/motivo/i)
			expect(newTextarea).toHaveValue('')
		})
	})

	describe('Validación de longitud de motivo', () => {
		it('should show minimum length message when under 20 chars', async () => {
			const user = userEvent.setup()
			render(<BusinessCancelModal {...defaultProps} />)

			await user.type(screen.getByPlaceholderText(/motivo/i), 'Corto')

			expect(screen.getByText(/Mínimo 20 caracteres/i)).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Confirmar/i })).toBeDisabled()
		})

		it('should not show minimum message when 20+ chars', async () => {
			const user = userEvent.setup()
			render(<BusinessCancelModal {...defaultProps} />)

			await user.type(
				screen.getByPlaceholderText(/motivo/i),
				'Este es un motivo suficientemente largo'
			)

			expect(
				screen.queryByText(/Mínimo 20 caracteres/i)
			).not.toBeInTheDocument()
		})

	it('should truncate at 500 characters', () => {
		render(<BusinessCancelModal {...defaultProps} />)

		const longText = 'a'.repeat(550)
		const textarea = screen.getByPlaceholderText(/motivo/i)
		fireEvent.change(textarea, { target: { value: longText } })

		expect(textarea).toHaveValue('a'.repeat(500))
		expect(screen.getByText('500/500')).toBeInTheDocument()
	})
	})

	describe('Estado de carga', () => {
		it('should show loading skeleton when isLoading', () => {
			render(<BusinessCancelModal {...defaultProps} isLoading={true} />)

			// Should show skeleton instead of content
			expect(screen.queryByText(/Cancelar Negocio/i)).not.toBeInTheDocument()
		})

		it('should not render when business is null', () => {
			render(<BusinessCancelModal {...defaultProps} business={null} />)

			expect(screen.queryByText(/Cancelar Negocio/i)).not.toBeInTheDocument()
		})

		it('should show loading state during submission', async () => {
			const user = userEvent.setup()
			let resolvePromise: () => void
			const onConfirm = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolvePromise = resolve
					})
			)

			render(<BusinessCancelModal {...defaultProps} onConfirm={onConfirm} />)

			await user.type(
				screen.getByPlaceholderText(/motivo/i),
				'Motivo válido para la cancelación'
			)
			await user.click(
				screen.getByRole('button', { name: /Confirmar Cancelación/i })
			)

			// Should show loading
			expect(screen.getByText(/Procesando cancelación/i)).toBeInTheDocument()

			// Resolve and verify
			resolvePromise!()
		})
	})
})
