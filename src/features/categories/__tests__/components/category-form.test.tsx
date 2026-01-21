import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategoryForm } from '../../components/category-form'
import { createMockCategory } from '../fixtures/mock-category'

describe('CategoryForm', () => {
	const defaultProps = {
		mode: 'create' as const,
		onSubmit: vi.fn(),
		onCancel: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Create Mode', () => {
		it('should render form in create mode (happy path)', () => {
			render(<CategoryForm {...defaultProps} />)

			expect(screen.getByLabelText(/código/i)).toBeInTheDocument()
			expect(
				screen.getByLabelText(/nombre de la categoría/i)
			).toBeInTheDocument()
			expect(screen.getByText(/tipo de categoría/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
			expect(screen.getByText(/estado/i)).toBeInTheDocument()
			expect(screen.getByText('Crear Categoría')).toBeInTheDocument()
		})

		it('should display all form fields', () => {
			render(<CategoryForm {...defaultProps} />)

			// Code field
			const codeInput = screen.getByPlaceholderText(
				/ingrese el código de la categoría/i
			)
			expect(codeInput).toBeInTheDocument()

			// Name field
			const nameInput = screen.getByPlaceholderText(
				/ingrese el nombre de la categoría/i
			)
			expect(nameInput).toBeInTheDocument()

			// Description field
			const descriptionInput = screen.getByPlaceholderText(
				/ingrese una descripción/i
			)
			expect(descriptionInput).toBeInTheDocument()
		})

		it('should call onCancel when cancel button clicked', async () => {
			const user = userEvent.setup()
			const onCancel = vi.fn()

			render(<CategoryForm {...defaultProps} onCancel={onCancel} />)

			await user.click(screen.getByText('Cancelar'))

			expect(onCancel).toHaveBeenCalled()
		})

		it('should disable submit button when isLoading is true', () => {
			render(<CategoryForm {...defaultProps} isLoading={true} />)

			expect(screen.getByText('Creando...')).toBeDisabled()
		})
	})

	describe('Edit Mode', () => {
		const mockCategory = createMockCategory({
			code: 'CAT001',
			name: 'Agente Original',
			typeCategory: 'ALIADO',
			descripcion: 'Descripción original',
			status: false,
		})

		it('should render form in edit mode with initialData', () => {
			render(
				<CategoryForm
					{...defaultProps}
					mode="edit"
					initialData={mockCategory}
				/>
			)

			expect(screen.getByText('Guardar Cambios')).toBeInTheDocument()
		})

		it('should pre-fill form in edit mode', () => {
			render(
				<CategoryForm
					{...defaultProps}
					mode="edit"
					initialData={mockCategory}
				/>
			)

			expect(screen.getByLabelText(/código/i)).toHaveValue('CAT001')
			expect(screen.getByLabelText(/nombre de la categoría/i)).toHaveValue(
				'Agente Original'
			)
			expect(screen.getByLabelText(/descripción/i)).toHaveValue(
				'Descripción original'
			)
		})

		it('should show Guardando... when isLoading in edit mode', () => {
			render(
				<CategoryForm
					{...defaultProps}
					mode="edit"
					initialData={mockCategory}
					isLoading={true}
				/>
			)

			expect(screen.getByText('Guardando...')).toBeDisabled()
		})
	})

	describe('Validation', () => {
		it('should show validation errors for empty required fields', async () => {
			const user = userEvent.setup()

			render(<CategoryForm {...defaultProps} />)

			// Try to submit empty form
			await user.click(screen.getByText('Crear Categoría'))

			await waitFor(() => {
				// Should show validation errors
				expect(screen.getByText(/el código es requerido/i)).toBeInTheDocument()
			})
		})

		it('should validate code length', async () => {
			const user = userEvent.setup()

			render(<CategoryForm {...defaultProps} />)

			// Type a code that's too long
			const codeInput = screen.getByLabelText(/código/i)
			await user.type(codeInput, 'A'.repeat(25))

			// Submit to trigger validation
			await user.click(screen.getByText('Crear Categoría'))

			await waitFor(() => {
				expect(
					screen.getByText(/el código no puede exceder 20 caracteres/i)
				).toBeInTheDocument()
			})
		})
	})

	describe('Form Disabled State', () => {
		it('should disable all inputs when loading', () => {
			render(<CategoryForm {...defaultProps} isLoading={true} />)

			expect(screen.getByLabelText(/código/i)).toBeDisabled()
			expect(screen.getByLabelText(/nombre de la categoría/i)).toBeDisabled()
			expect(screen.getByLabelText(/descripción/i)).toBeDisabled()
		})

		it('should disable cancel button when loading', () => {
			render(<CategoryForm {...defaultProps} isLoading={true} />)

			expect(screen.getByText('Cancelar')).toBeDisabled()
		})
	})
})
