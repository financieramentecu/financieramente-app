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

			expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
			expect(screen.getByText('Crear Categoría')).toBeInTheDocument()
		})

		it('should display name and description fields', () => {
			render(<CategoryForm {...defaultProps} />)

			expect(screen.getByPlaceholderText(/nombre de la categoría/i)).toBeInTheDocument()
		})

		it('should show idCategoryType selector', () => {
			render(<CategoryForm {...defaultProps} />)

			expect(screen.getByText(/tipo de categoría/i)).toBeInTheDocument()
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
			id: 1,
			name: 'Categoría Original',
			description: 'Descripción original',
			idCategoryType: 1,
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

		it('should pre-fill name in edit mode', () => {
			render(
				<CategoryForm
					{...defaultProps}
					mode="edit"
					initialData={mockCategory}
				/>
			)

			expect(screen.getByLabelText(/nombre/i)).toHaveValue('Categoría Original')
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
		it('should show validation error when name is empty', async () => {
			const user = userEvent.setup()

			render(<CategoryForm {...defaultProps} />)

			await user.click(screen.getByText('Crear Categoría'))

			await waitFor(() => {
				expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument()
			})
		})
	})

	describe('Form Disabled State', () => {
		it('should disable name input when loading', () => {
			render(<CategoryForm {...defaultProps} isLoading={true} />)

			expect(screen.getByLabelText(/nombre/i)).toBeDisabled()
		})

		it('should disable cancel button when loading', () => {
			render(<CategoryForm {...defaultProps} isLoading={true} />)

			expect(screen.getByText('Cancelar')).toBeDisabled()
		})
	})
})
