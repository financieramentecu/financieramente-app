import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductForm } from '../../components/product-form'
import {
	createMockProduct,
	createMockCompanyOption,
} from '../fixtures/mock-product'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
	})),
}))

describe('ProductForm', () => {
	const mockOnSubmit = vi.fn()
	const mockOnCancel = vi.fn()
	const mockCompanies = [
		createMockCompanyOption({ idCompany: 1, name: 'Skandia' }),
		createMockCompanyOption({ idCompany: 2, name: 'Sura' }),
	]

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Create Mode', () => {
		it('should render form with empty fields (happy path)', () => {
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			expect(screen.getByLabelText(/nombre del producto/i)).toBeInTheDocument()
			// For Radix UI Select, we check for the label element directly
			const companyLabels = screen.getAllByText(/compañía/i)
			expect(companyLabels.length).toBeGreaterThan(0)
			expect(companyLabels[0].tagName.toLowerCase()).toBe('label')
			expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument()
			const statusLabels = screen.getAllByText(/estado/i)
			expect(statusLabels.length).toBeGreaterThan(0)
			expect(statusLabels[0].tagName.toLowerCase()).toBe('label')
			expect(screen.getAllByRole('combobox')[1]).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /guardar/i })
			).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /cancelar/i })
			).toBeInTheDocument()
		})

		it('should call onCancel when cancel button is clicked', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const cancelButton = screen.getByRole('button', { name: /cancelar/i })
			await user.click(cancelButton)

			expect(mockOnCancel).toHaveBeenCalledTimes(1)
		})

		it('should disable submit button when loading', () => {
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
					isLoading={true}
				/>
			)

			const submitButton = screen.getByRole('button', { name: /guardando/i })
			expect(submitButton).toBeDisabled()
		})

		it('should show loading text when submitting', async () => {
			const user = userEvent.setup()
			mockOnSubmit.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 100))
			)

			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre del producto/i)
			await user.type(nameInput, 'Seguro de Vida')

			// Select company - get the first combobox (company selector)
			const companySelects = screen.getAllByRole('combobox')
			await user.click(companySelects[0])
			await waitFor(() => {
				expect(
					screen.getByRole('option', { name: 'Skandia' })
				).toBeInTheDocument()
			})
			await user.click(screen.getByRole('option', { name: 'Skandia' }))

			const submitButton = screen.getByRole('button', { name: /guardar/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /guardando/i })
				).toBeInTheDocument()
			})
		})

		it('should validate required fields', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const submitButton = screen.getByRole('button', { name: /guardar/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(
					screen.getByText(/debe tener al menos 2 caracteres/i)
				).toBeInTheDocument()
			})
		})

		it('should validate name minimum length', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre del producto/i)
			await user.type(nameInput, 'A')

			const submitButton = screen.getByRole('button', { name: /guardar/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(
					screen.getByText(/debe tener al menos 2 caracteres/i)
				).toBeInTheDocument()
			})
		})

		it('should submit form with valid data (happy path)', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre del producto/i)
			await user.type(nameInput, 'Seguro de Vida')

			// Select company - get the first combobox (company selector)
			const companySelects = screen.getAllByRole('combobox')
			await user.click(companySelects[0])
			await waitFor(() => {
				expect(
					screen.getByRole('option', { name: 'Skandia' })
				).toBeInTheDocument()
			})
			await user.click(screen.getByRole('option', { name: 'Skandia' }))

			const submitButton = screen.getByRole('button', { name: /guardar/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(mockOnSubmit).toHaveBeenCalledWith(
					expect.objectContaining({
						name: 'Seguro de Vida',
						idCompany: 1,
						status: true,
					})
				)
			})
		})
	})

	describe('Edit Mode', () => {
		const mockProduct = createMockProduct({
			idProduct: 1,
			name: 'Seguro de Vida',
			idCompany: 1,
			status: true,
		})

		it('should render form with initial data (happy path)', () => {
			render(
				<ProductForm
					mode="edit"
					initialData={mockProduct}
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(
				/nombre del producto/i
			) as HTMLInputElement
			expect(nameInput.value).toBe('Seguro de Vida')
		})

		it('should show update button text in edit mode', () => {
			render(
				<ProductForm
					mode="edit"
					initialData={mockProduct}
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			expect(
				screen.getByRole('button', { name: /actualizar/i })
			).toBeInTheDocument()
		})

		it('should submit form with updated data', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="edit"
					initialData={mockProduct}
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre del producto/i)
			await user.clear(nameInput)
			await user.type(nameInput, 'Seguro Actualizado')

			const submitButton = screen.getByRole('button', { name: /actualizar/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(mockOnSubmit).toHaveBeenCalledWith(
					expect.objectContaining({
						name: 'Seguro Actualizado',
					})
				)
			})
		})

		it('should allow partial updates', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="edit"
					initialData={mockProduct}
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			// Change status to inactive - get the second combobox (status selector)
			const statusSelects = screen.getAllByRole('combobox')
			const statusSelect = statusSelects[1]
			await user.click(statusSelect)
			await waitFor(() => {
				expect(
					screen.getByRole('option', { name: 'Inactivo' })
				).toBeInTheDocument()
			})
			await user.click(screen.getByRole('option', { name: 'Inactivo' }))

			const submitButton = screen.getByRole('button', { name: /actualizar/i })
			await user.click(submitButton)

			await waitFor(
				() => {
					expect(mockOnSubmit).toHaveBeenCalled()
					const callArgs = mockOnSubmit.mock.calls[0][0]
					expect(callArgs).toHaveProperty('status', false)
				},
				{ timeout: 3000 }
			)
		})

		it('should disable form when loading', () => {
			render(
				<ProductForm
					mode="edit"
					initialData={mockProduct}
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
					isLoading={true}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre del producto/i)
			expect(nameInput).toBeDisabled()
		})
	})

	describe('Error Handling', () => {
		it('should display validation errors for invalid name', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre del producto/i)
			await user.type(nameInput, 'A')

			const submitButton = screen.getByRole('button', { name: /guardar/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(
					screen.getByText(/debe tener al menos 2 caracteres/i)
				).toBeInTheDocument()
			})
		})

		it('should display validation errors for name too long', async () => {
			const user = userEvent.setup()
			render(
				<ProductForm
					mode="create"
					companies={mockCompanies}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre del producto/i)
			await user.type(nameInput, 'A'.repeat(101))

			const submitButton = screen.getByRole('button', { name: /guardar/i })
			await user.click(submitButton)

			await waitFor(() => {
				expect(
					screen.getByText(/no puede exceder 100 caracteres/i)
				).toBeInTheDocument()
			})
		})
	})
})
