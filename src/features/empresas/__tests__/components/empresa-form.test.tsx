import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmpresaForm } from '../../components/empresa-form'
import { createMockEmpresa } from '../fixtures/mock-empresa'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
	})),
}))

describe('EmpresaForm', () => {
	const mockOnSubmit = vi.fn()
	const mockOnCancel = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Create Mode', () => {
		it('should render form with empty fields', () => {
			render(
				<EmpresaForm
					mode="create"
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			expect(
				screen.getByLabelText(/nombre completo de la agencia/i)
			).toBeInTheDocument()
			// Select component uses combobox role, not directly associated with label
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
				<EmpresaForm
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
				<EmpresaForm
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
		const mockEmpresa = createMockEmpresa({
			idCompany: 1,
			name: 'Skandia Seguros',
			status: true,
		})

		it('should render form with initial data', () => {
			render(
				<EmpresaForm
					mode="edit"
					initialData={mockEmpresa}
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
				<EmpresaForm
					mode="edit"
					initialData={mockEmpresa}
					onSubmit={mockOnSubmit}
					onCancel={mockOnCancel}
				/>
			)

			const nameInput = screen.getByLabelText(/nombre completo de la agencia/i)
			expect(nameInput).toBeDisabled()
		})

		it('should show update button text in edit mode', () => {
			render(
				<EmpresaForm
					mode="edit"
					initialData={mockEmpresa}
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
