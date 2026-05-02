import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { BusinessViewModal } from '../../components/modals/BusinessViewModal'
import { createMockBusiness } from '../fixtures/mock-business'

vi.mock('sonner', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}))

vi.mock('@/features/shared/ui/alert-dialog', () => ({
	AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="mock-alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
	AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button data-testid="mock-confirm-btn" onClick={onClick}>{children}</button>,
}))

describe('BusinessViewModal', () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		business: createMockBusiness(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Happy Path', () => {
		it('should render business ID in title', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText(/Negocio #1/)).toBeInTheDocument()
		})

		it('should display client information', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('María García López')).toBeInTheDocument()
			expect(screen.getByText('1234567890')).toBeInTheDocument()
			expect(screen.getByText('maria.garcia@email.com')).toBeInTheDocument()
		})

		it('should display product information', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('Crédito Personal')).toBeInTheDocument()
			expect(screen.getByText('Skandia')).toBeInTheDocument()
		})

		it('should display agent information', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('Carlos Money Strategist Pérez')).toBeInTheDocument()
			expect(screen.getByText('Money Strategist')).toBeInTheDocument()
		})

		it('should show status badge', () => {
			const business = createMockBusiness({ status: 'EMITIDO' })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			expect(screen.getByText('Emitido')).toBeInTheDocument()
		})

		it('should format currency value', () => {
			render(<BusinessViewModal {...defaultProps} />)

			// Verifica que muestra el valor formateado (COP)
			expect(screen.getByText(/15.*000.*000/)).toBeInTheDocument()
		})

		it('should call onOpenChange when close button clicked', () => {
			const onOpenChange = vi.fn()
			render(
				<BusinessViewModal {...defaultProps} onOpenChange={onOpenChange} />
			)

			fireEvent.click(screen.getByRole('button', { name: /Cerrar/i }))

			expect(onOpenChange).toHaveBeenCalledWith(false)
		})

		it('should display term correctly', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('12')).toBeInTheDocument()
		})

		it('should display periodicity', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('Mensual')).toBeInTheDocument()
		})

		it('should display client origin', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText(/Referido/)).toBeInTheDocument()
		})
	})

	describe('Flujos Alternos', () => {
		it('should show "Sin asignar" when contract is null', () => {
			const business = createMockBusiness({ contract: null })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			expect(screen.getByText('Sin asignar')).toBeInTheDocument()
		})

		it('should not render when business is null', () => {
			render(<BusinessViewModal {...defaultProps} business={null} />)

			expect(screen.queryByText(/Negocio #/)).not.toBeInTheDocument()
		})

		it('should handle missing periodicity', () => {
			const business = createMockBusiness({ periodicity: null })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			// Busca el guión que indica "no disponible"
			const periodicityElements = screen.getAllByText('-')
			expect(periodicityElements.length).toBeGreaterThan(0)
		})

		it('should handle missing term', () => {
			const business = createMockBusiness({ term: null })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			// Busca el guión que indica "no disponible"
			const termElements = screen.getAllByText('-')
			expect(termElements.length).toBeGreaterThan(0)
		})

		it('should show loading skeleton when isLoading', () => {
			render(<BusinessViewModal {...defaultProps} isLoading={true} />)

			expect(screen.getByText('Cargando...')).toBeInTheDocument()
		})

		it('should not render when open is false', () => {
			render(<BusinessViewModal {...defaultProps} open={false} />)

			expect(screen.queryByText(/Negocio #/)).not.toBeInTheDocument()
		})
	})

	describe('Edit client origin from Ver Negocio modal when EMITIDO', () => {
		const clientOriginsOptions = [
			{ value: '1', label: 'Referido' },
			{ value: '2', label: 'Propio' },
		]

		it('Modal loads with origin as label and Editar origen in footer when EMITIDO', () => {
			const business = createMockBusiness({
				status: 'EMITIDO',
				clientOrigin: { id: 1, name: 'Referido' },
			})
			render(
				<BusinessViewModal
					{...defaultProps}
					business={business}
					allowEditOrigin
					clientOriginsOptions={clientOriginsOptions}
					onSaveOrigin={vi.fn()}
				/>
			)

			expect(screen.getByText('Referido')).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /Editar origen/i })
			).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Cerrar/i })).toBeInTheDocument()
			expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		})

		it('Clicking Editar origen shows Select and Guardar in footer', async () => {
			const business = createMockBusiness({
				status: 'EMITIDO',
				clientOrigin: { id: 1, name: 'Referido' },
			})
			render(
				<BusinessViewModal
					{...defaultProps}
					business={business}
					allowEditOrigin
					clientOriginsOptions={clientOriginsOptions}
					onSaveOrigin={vi.fn()}
				/>
			)

			const editarOrigenBtn = screen.getByRole('button', {
				name: /Editar origen/i,
			})
			await fireEvent.click(editarOrigenBtn)

			expect(screen.getByRole('combobox')).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Guardar/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Cerrar/i })).toBeInTheDocument()
			expect(
				screen.queryByRole('button', { name: /Editar origen/i })
			).not.toBeInTheDocument()
		})

		it('User saves new origin and modal returns to label view', async () => {
			const onSaveOrigin = vi.fn().mockResolvedValue(undefined)
			const business = createMockBusiness({
				status: 'EMITIDO',
				clientOrigin: { id: 1, name: 'Referido' },
			})
			render(
				<BusinessViewModal
					{...defaultProps}
					business={business}
					allowEditOrigin
					clientOriginsOptions={clientOriginsOptions}
					onSaveOrigin={onSaveOrigin}
				/>
			)

			fireEvent.click(
				screen.getByRole('button', { name: /Editar origen/i })
			)
			const select = screen.getByRole('combobox') // Radix Select Trigger
			await userEvent.click(select) // Opens Radix Dropdown
			const option = await screen.findByRole('option', { name: 'Propio' })
			await userEvent.click(option)
			const guardarBtn = screen.getByRole('button', { name: /^Guardar$/i })
			expect(guardarBtn).not.toBeDisabled()
			await userEvent.click(guardarBtn)

			const confirmarBtn = await screen.findByTestId('mock-confirm-btn')
			await userEvent.click(confirmarBtn)

			await waitFor(() => {
				expect(onSaveOrigin).toHaveBeenCalledWith(1, 2)
			})
			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /Editar origen/i })
				).toBeInTheDocument()
			})
			expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		})

		it('Non-EMITIDO business does not show Editar origen', () => {
			const business = createMockBusiness({
				status: 'VENTA_EFECTUADA',
				clientOrigin: { id: 1, name: 'Referido' },
			})
			render(
				<BusinessViewModal
					{...defaultProps}
					business={business}
					allowEditOrigin
					clientOriginsOptions={clientOriginsOptions}
					onSaveOrigin={vi.fn()}
				/>
			)

			expect(screen.getByText('Referido')).toBeInTheDocument()
			expect(
				screen.queryByRole('button', { name: /Editar origen/i })
			).not.toBeInTheDocument()
			expect(screen.getByRole('button', { name: /Cerrar/i })).toBeInTheDocument()
		})

		it('shows toast.error with API error message when onSaveOrigin rejects with a 400-like error', async () => {
			const errorMessage = 'No existe configuración de distribución para el origen, producto y categoría del negocio.'
			const onSaveOrigin = vi.fn().mockRejectedValue(new Error(errorMessage))
			const business = createMockBusiness({
				status: 'EMITIDO',
				clientOrigin: { id: 1, name: 'Referido' },
			})
			render(
				<BusinessViewModal
					{...defaultProps}
					business={business}
					allowEditOrigin
					clientOriginsOptions={clientOriginsOptions}
					onSaveOrigin={onSaveOrigin}
				/>
			)

			fireEvent.click(screen.getByRole('button', { name: /Editar origen/i }))
			const select = screen.getByRole('combobox')
			await userEvent.click(select)
			const option = await screen.findByRole('option', { name: 'Propio' })
			await userEvent.click(option)
			const guardarBtn = screen.getByRole('button', { name: /^Guardar$/i })
			await userEvent.click(guardarBtn)

			const confirmarBtn = await screen.findByTestId('mock-confirm-btn')
			await userEvent.click(confirmarBtn)

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(errorMessage)
			})
		})

		it('does not call toast.error when onSaveOrigin resolves successfully', async () => {
			const onSaveOrigin = vi.fn().mockResolvedValue(undefined)
			const business = createMockBusiness({
				status: 'EMITIDO',
				clientOrigin: { id: 1, name: 'Referido' },
			})
			render(
				<BusinessViewModal
					{...defaultProps}
					business={business}
					allowEditOrigin
					clientOriginsOptions={clientOriginsOptions}
					onSaveOrigin={onSaveOrigin}
				/>
			)

			fireEvent.click(screen.getByRole('button', { name: /Editar origen/i }))
			const select = screen.getByRole('combobox')
			await userEvent.click(select)
			const option = await screen.findByRole('option', { name: 'Propio' })
			await userEvent.click(option)
			const guardarBtn = screen.getByRole('button', { name: /^Guardar$/i })
			await userEvent.click(guardarBtn)

			const confirmarBtn = await screen.findByTestId('mock-confirm-btn')
			await userEvent.click(confirmarBtn)

			await waitFor(() => {
				expect(onSaveOrigin).toHaveBeenCalledWith(1, 2)
			})
			expect(toast.error).not.toHaveBeenCalled()
		})
	})
})
