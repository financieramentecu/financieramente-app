import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CompanyForm } from '../../components/company-form'
import { createMockCompany } from '../fixtures/mock-company'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
	})),
}))

describe('CompanyForm', () => {
	const mockOnSubmit = vi.fn()
	const mockOnCancel = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Create Mode', () => {
		it('should render form with empty fields', () => {
			render(
				<CompanyForm
					mode="create"
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			expect(
				screen.getByLabelText(/nombre completo de la agencia/i)
			).toBeInTheDocument()
			expect(screen.getByText(/estado/i)).toBeInTheDocument()
			expect(screen.getByRole('combobox')).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /guardar/i })
			).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /cancelar/i })
			).toBeInTheDocument()
		})

		it('should call onCancel when cancel button is clicked', () => {
			render(
				<CompanyForm
					mode="create"
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const cancelButton = screen.getByRole('button', { name: /cancelar/i })
			cancelButton.click()

			expect(mockOnCancel).toHaveBeenCalledTimes(1)
		})

		it('should disable submit button when loading', () => {
			render(
				<CompanyForm
					mode="create"
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
					isLoading={true}
				/>
			)

			const submitButton = screen.getByRole('button', { name: /guardando/i })
			expect(submitButton).toBeDisabled()
		})
	})

	describe('Edit Mode', () => {
		const mockCompany = createMockCompany({
			idCompany: 1,
			name: 'Skandia Seguros',
			status: true,
		})

		it('should render form with initial data', () => {
			render(
				<CompanyForm
					mode="edit"
					initialData={mockCompany}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(
				/nombre completo de la agencia/i
			) as HTMLInputElement
			expect(nameInput.value).toBe('Skandia Seguros')
			expect(nameInput).toBeDisabled()
		})

		it('should disable name field in edit mode', () => {
			render(
				<CompanyForm
					mode="edit"
					initialData={mockCompany}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre completo de la agencia/i)
			expect(nameInput).toBeDisabled()
		})

		it('should show update button text in edit mode', () => {
			render(
				<CompanyForm
					mode="edit"
					initialData={mockCompany}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			expect(
				screen.getByRole('button', { name: /actualizar/i })
			).toBeInTheDocument()
		})
	})
})
