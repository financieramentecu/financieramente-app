import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { BusinessForm as CreateBusinessForm } from '@/features/negocios/components/business-form'
import { mockUsers } from '@/features/shared/__tests__/fixtures/mockUsers'
import { mockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'

// Mock de los hooks que hacen llamadas a la API
vi.mock('@/features/negocios/hooks/useSearchClient', () => ({
	useSearchClient: () => ({
		handleSearchClient: vi.fn().mockResolvedValue([]),
		results: [],
	}),
}))

vi.mock('@/features/negocios/hooks/useSearchAgents', () => ({
	useSearchAgents: () => ({
		handleSearchAgents: vi.fn().mockResolvedValue([]),
	}),
}))

describe('CreateBusinessForm', () => {
	const mockOnSubmit = vi.fn()
	const mockOnCancel = vi.fn()

	const defaultProps = {
		onSubmit: mockOnSubmit,
		onCancel: mockOnCancel,
		currentUser: mockUserWithRole,
		companiesOptions: [],
		productsOptions: [],
		periodicitiesOptions: [],
		currenciesOptions: [],
		clientOriginsOptions: [],
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders form with all fields', () => {
		render(<CreateBusinessForm {...defaultProps} />)

		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Nombres/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Apellidos/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/No. Documento/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument()
	})

	it('blocks all fields except documento when documento is empty', () => {
		render(<CreateBusinessForm {...defaultProps} />)

		const emailInput = screen.getByLabelText(/Email/i)
		const nombresInput = screen.getByLabelText(/Nombres/i)
		// El componente de documento ahora es un combobox (Button), no un input
		const docTrigger = screen.getByRole('combobox', { name: /No\. Documento/i })

		expect(docTrigger).not.toBeDisabled()
		expect(emailInput).toBeDisabled()
		expect(nombresInput).toBeDisabled()
	})

	it('unlocks all fields when documento has value', async () => {
		const user = userEvent.setup()
		render(<CreateBusinessForm {...defaultProps} />)

		const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
		const docTrigger = screen.getByRole('combobox', { name: /No\. Documento/i })

		// Hacer click en el combobox para abrirlo
		await user.click(docTrigger)

		// Buscar y seleccionar un usuario
		const searchInput = screen.getByPlaceholderText(
			/Buscar cliente por documento/i
		)
		await user.type(searchInput, mockUsers[0].identityNumber)

		// Seleccionar el primer resultado
		await waitFor(() => {
			const firstResult = screen.getByText(
				new RegExp(mockUsers[0].identityNumber, 'i')
			)
			expect(firstResult).toBeInTheDocument()
		})

		await user.click(
			screen.getByText(new RegExp(mockUsers[0].identityNumber, 'i'))
		)

		await waitFor(() => {
			expect(emailInput).not.toBeDisabled()
		})
	})

	it('submit button is disabled when documento is empty', () => {
		render(<CreateBusinessForm {...defaultProps} />)

		const submitButton = screen.getByRole('button', {
			name: /Aceptar y Guardar/i,
		})
		expect(submitButton).toBeDisabled()
	})

	it('shows validation error for invalid email', async () => {
		const user = userEvent.setup()
		render(<CreateBusinessForm {...defaultProps} />)

		const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
		const docTrigger = screen.getByRole('combobox', { name: /No\. Documento/i })

		// Seleccionar un documento
		await user.click(docTrigger)
		const searchInput = screen.getByPlaceholderText(
			/Buscar cliente por documento/i
		)
		await user.type(searchInput, mockUsers[0].identityNumber)
		await waitFor(() => {
			expect(
				screen.getByText(new RegExp(mockUsers[0].identityNumber, 'i'))
			).toBeInTheDocument()
		})
		await user.click(
			screen.getByText(new RegExp(mockUsers[0].identityNumber, 'i'))
		)

		// Cambiar email a inválido
		await user.clear(emailInput)
		await user.type(emailInput, 'invalid-email')

		await waitFor(() => {
			const submitButton = screen.getByRole('button', {
				name: /Aceptar y Guardar/i,
			})
			expect(submitButton).not.toBeDisabled()
		})

		const submitButton = screen.getByRole('button', {
			name: /Aceptar y Guardar/i,
		})
		await user.click(submitButton)

		await waitFor(() => {
			expect(screen.getByText(/Email inválido/i)).toBeInTheDocument()
		})
	})

	it('calls onCancel when cancel button is clicked', () => {
		render(<CreateBusinessForm {...defaultProps} />)

		const cancelButton = screen.getByRole('button', { name: /Cancelar/i })
		fireEvent.click(cancelButton)

		expect(mockOnCancel).toHaveBeenCalledTimes(1)
	})

	it('submit button is enabled when documento has value', async () => {
		const user = userEvent.setup()
		render(<CreateBusinessForm {...defaultProps} />)

		const docTrigger = screen.getByRole('combobox', { name: /No\. Documento/i })
		await user.click(docTrigger)
		const searchInput = screen.getByPlaceholderText(
			/Buscar cliente por documento/i
		)
		await user.type(searchInput, mockUsers[0].identityNumber)
		await waitFor(() => {
			expect(
				screen.getByText(new RegExp(mockUsers[0].identityNumber, 'i'))
			).toBeInTheDocument()
		})
		await user.click(
			screen.getByText(new RegExp(mockUsers[0].identityNumber, 'i'))
		)

		await waitFor(() => {
			const submitButton = screen.getByRole('button', {
				name: /Aceptar y Guardar/i,
			})
			expect(submitButton).not.toBeDisabled()
		})
	})

	it.skip('displays loading state during submission', async () => {
		const user = userEvent.setup()
		mockOnSubmit.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 200))
		)

		render(<CreateBusinessForm {...defaultProps} />)

		const docTrigger = screen.getByRole('combobox', { name: /No\. Documento/i })
		await user.click(docTrigger)
		const searchInput = screen.getByPlaceholderText(
			/Buscar cliente por documento/i
		)
		await user.type(searchInput, mockUsers[0].identityNumber)
		await waitFor(() => {
			expect(
				screen.getByText(new RegExp(mockUsers[0].identityNumber, 'i'))
			).toBeInTheDocument()
		})
		await user.click(
			screen.getByText(new RegExp(mockUsers[0].identityNumber, 'i'))
		)

		const submitButton = await waitFor(() => {
			const btn = screen.getByRole('button', { name: /Aceptar y Guardar/i })
			expect(btn).not.toBeDisabled()
			return btn
		})

		await user.click(submitButton)

		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: /Guardando.../i })
			).toBeInTheDocument()
		})
	})
})
