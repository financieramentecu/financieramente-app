import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LevelForm } from '../../components/level-form'
import { createMockLevel } from '../fixtures/mock-level'
import { SYSTEM_LEVEL_TYPE_NAME } from '../../types/level.types'

describe('LevelForm', () => {
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
			render(<LevelForm {...defaultProps} />)

			expect(screen.getByLabelText(/código/i)).toBeInTheDocument()
			expect(
				screen.getByLabelText(/nombre del nivel/i)
			).toBeInTheDocument()
			expect(screen.getByText(/tipo de nivel/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
			expect(screen.getByText(/estado/i)).toBeInTheDocument()
			expect(screen.getByText('Crear Nivel (Jerarquía)')).toBeInTheDocument()
		})

		it('should display all form fields', () => {
			render(<LevelForm {...defaultProps} />)

			const codeInput = screen.getByPlaceholderText(
				/ingrese el código del nivel/i
			)
			expect(codeInput).toBeInTheDocument()

			const nameInput = screen.getByPlaceholderText(
				/ingrese el nombre del nivel/i
			)
			expect(nameInput).toBeInTheDocument()

			const descriptionInput = screen.getByPlaceholderText(
				/ingrese una descripción/i
			)
			expect(descriptionInput).toBeInTheDocument()
		})

		it('should call onCancel when cancel button clicked', async () => {
			const user = userEvent.setup()
			const onCancel = vi.fn()

			render(<LevelForm {...defaultProps} onCancel={onCancel} />)

			await user.click(screen.getByText('Cancelar'))

			expect(onCancel).toHaveBeenCalled()
		})

		it('should disable submit button when isLoading is true', () => {
			render(<LevelForm {...defaultProps} isLoading={true} />)

			expect(screen.getByText('Creando...')).toBeDisabled()
		})
	})

	describe('Edit Mode', () => {
		const mockLevel = createMockLevel({
			code: 'LEVEL001',
			name: 'Agente Original',
			typeLevel: 'ALIADO',
			descripcion: 'Descripción original',
			status: false,
		})

		it('should render form in edit mode with initialData', () => {
			render(
				<LevelForm
					{...defaultProps}
					mode="edit"
					initialData={mockLevel}
				/>
			)

			expect(screen.getByText('Guardar Cambios')).toBeInTheDocument()
		})

		it('should pre-fill form in edit mode', () => {
			render(
				<LevelForm
					{...defaultProps}
					mode="edit"
					initialData={mockLevel}
				/>
			)

			expect(screen.getByLabelText(/código/i)).toHaveValue('LEVEL001')
			expect(screen.getByLabelText(/nombre del nivel/i)).toHaveValue(
				'Agente Original'
			)
			expect(screen.getByLabelText(/descripción/i)).toHaveValue(
				'Descripción original'
			)
		})

		it('should show Guardando... when isLoading in edit mode', () => {
			render(
				<LevelForm
					{...defaultProps}
					mode="edit"
					initialData={mockLevel}
					isLoading={true}
				/>
			)

			expect(screen.getByText('Guardando...')).toBeDisabled()
		})
	})

	describe('Validation', () => {
		it('should show validation errors for empty required fields', async () => {
			const user = userEvent.setup()

			render(<LevelForm {...defaultProps} />)

			await user.click(screen.getByText('Crear Nivel (Jerarquía)'))

			await waitFor(() => {
				expect(screen.getByText(/el código es requerido/i)).toBeInTheDocument()
			})
		})

		it('should validate code length', async () => {
			const user = userEvent.setup()

			render(<LevelForm {...defaultProps} />)

			const codeInput = screen.getByLabelText(/código/i)
			await user.type(codeInput, 'A'.repeat(25))

			await user.click(screen.getByText('Crear Nivel (Jerarquía)'))

			await waitFor(() => {
				expect(
					screen.getByText(/el código no puede exceder 20 caracteres/i)
				).toBeInTheDocument()
			})
		})
	})

	describe('Beneficiary Mode', () => {
		it('should render beneficiaryMode selector', () => {
			render(<LevelForm {...defaultProps} />)

			expect(screen.getByText(/modo de beneficiario/i)).toBeInTheDocument()
		})

		it('should not show idFixedBeneficiaryUser picker when OVERRIDE is selected', () => {
			const level = createMockLevel({
				beneficiaryMode: 'OVERRIDE',
				idFixedBeneficiaryUser: null,
			})
			render(
				<LevelForm {...defaultProps} mode="edit" initialData={level} />
			)

			expect(
				screen.queryByText(/usuario beneficiario fijo/i)
			).not.toBeInTheDocument()
		})

		it('should show idFixedBeneficiaryUser picker when BENEFICIARIO_GENERAL is selected', () => {
			const level = createMockLevel({
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: null,
			})
			render(
				<LevelForm {...defaultProps} mode="edit" initialData={level} />
			)

			expect(
				screen.getByText(/usuario beneficiario fijo/i)
			).toBeInTheDocument()
		})

		it('should show read-only system user display for system levels with BENEFICIARIO_GENERAL and a configured user', () => {
			const systemLevel = createMockLevel({
				typeLevel: SYSTEM_LEVEL_TYPE_NAME,
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: 5,
				fixedBeneficiaryUser: {
					idUser: 5,
					name: 'Usuario',
					lastName: 'Sistema',
					email: 'sistema@test.com',
				},
			})

			render(
				<LevelForm {...defaultProps} mode="edit" initialData={systemLevel} />
			)

			expect(screen.getByTestId('system-user-readonly')).toBeInTheDocument()
			expect(screen.getByText('sistema@test.com')).toBeInTheDocument()
		})

		it('should show empty state placeholder for system levels with BENEFICIARIO_GENERAL and no user configured', () => {
			const systemLevel = createMockLevel({
				typeLevel: SYSTEM_LEVEL_TYPE_NAME,
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: null,
				fixedBeneficiaryUser: null,
			})

			render(
				<LevelForm {...defaultProps} mode="edit" initialData={systemLevel} />
			)

			expect(screen.getByTestId('system-user-empty')).toBeInTheDocument()
		})
	})

	describe('Form Disabled State', () => {
		it('should disable all inputs when loading', () => {
			render(<LevelForm {...defaultProps} isLoading={true} />)

			expect(screen.getByLabelText(/código/i)).toBeDisabled()
			expect(screen.getByLabelText(/nombre del nivel/i)).toBeDisabled()
			expect(screen.getByLabelText(/descripción/i)).toBeDisabled()
		})

		it('should disable cancel button when loading', () => {
			render(<LevelForm {...defaultProps} isLoading={true} />)

			expect(screen.getByText('Cancelar')).toBeDisabled()
		})
	})

	describe('Hierarchy specs', () => {
		it('color input renders with type="color"', () => {
			render(<LevelForm {...defaultProps} />)

			const colorInput = screen.getByLabelText(/color/i)
			expect(colorInput).toHaveAttribute('type', 'color')
		})

		it('next-level select excludes the current level id', () => {
			const level = createMockLevel({ idLevel: 3 })
			render(
				<LevelForm
					{...defaultProps}
					mode="edit"
					initialData={level}
					levels={[
						{ idLevel: 1, name: 'MS Junior' },
						{ idLevel: 2, name: 'MS Senior' },
						{ idLevel: 3, name: 'Team Leader' },
					]}
				/>
			)

			expect(screen.queryByRole('option', { name: /team leader/i })).not.toBeInTheDocument()
			expect(screen.getByText('Siguiente nivel')).toBeInTheDocument()
		})

		it('switching to OVERRIDE clears user selector', async () => {
			const user = userEvent.setup()
			const level = createMockLevel({
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: null,
			})
			render(
				<LevelForm {...defaultProps} mode="edit" initialData={level} />
			)

			expect(screen.getByText(/usuario beneficiario/i)).toBeInTheDocument()

			const trigger = screen.getByRole('combobox', { name: /modo de beneficiario/i })
			await user.click(trigger)
			const overrideOption = screen.getByRole('option', { name: /override/i })
			await user.click(overrideOption)

			await waitFor(() => {
				expect(screen.queryByText(/usuario beneficiario fijo/i)).not.toBeInTheDocument()
			})
		})
	})
})
