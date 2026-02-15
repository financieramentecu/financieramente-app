import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProductConfigurationForm } from '../../components/product-configuration-form'
import { createMockProductConfiguration } from '../fixtures/mock-product-configuration'

// Mock fetch for select data loading
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ProductConfigurationForm', () => {
	const defaultCreateProps = {
		mode: 'create' as const,
		onSubmit: vi.fn(),
		onCancel: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		// Mock API calls for selects
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				data: {
					companies: [],
					products: [],
					clientOrigins: [],
					categories: [],
				},
			}),
		})
	})

	describe('create mode', () => {
		it('should render create form title', () => {
			render(<ProductConfigurationForm {...defaultCreateProps} />)

			expect(screen.getByText('Datos de la Configuración')).toBeInTheDocument()
		})

		it('should render company select', () => {
			render(<ProductConfigurationForm {...defaultCreateProps} />)

			expect(screen.getByText('Compañía')).toBeInTheDocument()
		})

		it('should render product select', () => {
			render(<ProductConfigurationForm {...defaultCreateProps} />)

			expect(screen.getByText('Producto')).toBeInTheDocument()
		})

		it('should render client origin select', () => {
			render(<ProductConfigurationForm {...defaultCreateProps} />)

			expect(screen.getByText('Origen de Cliente')).toBeInTheDocument()
		})

		it('should render category select', () => {
			render(<ProductConfigurationForm {...defaultCreateProps} />)

			expect(screen.getByText('Categoría')).toBeInTheDocument()
		})

		it('should render create button', () => {
			render(<ProductConfigurationForm {...defaultCreateProps} />)

			expect(screen.getByText('Crear Configuración')).toBeInTheDocument()
		})

		it('should render cancel button', () => {
			render(<ProductConfigurationForm {...defaultCreateProps} />)

			expect(screen.getByText('Cancelar')).toBeInTheDocument()
		})

		it('should show loading state', () => {
			render(
				<ProductConfigurationForm {...defaultCreateProps} isLoading={true} />
			)

			expect(screen.getByText('Creando...')).toBeInTheDocument()
		})
	})

	describe('edit mode', () => {
		const initialData = createMockProductConfiguration()
		const defaultEditProps = {
			mode: 'edit' as const,
			initialData,
			ppcOptions: [{ idProductPercentageCommission: 1, active: true }],
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
		}

		it('should render edit form title', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			expect(
				screen.getByText('Información de la Configuración')
			).toBeInTheDocument()
		})

		it('should show company as readonly', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			const companyInput = screen.getByDisplayValue('Empresa Test')
			expect(companyInput).toBeDisabled()
		})

		it('should show product as readonly', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			const productInput = screen.getByDisplayValue('Crea Patrimonio')
			expect(productInput).toBeDisabled()
		})

		it('should show client origin as readonly', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			const originInput = screen.getByDisplayValue('Propio')
			expect(originInput).toBeDisabled()
		})

		it('should show category as readonly', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			const categoryInput = screen.getByDisplayValue('Junior')
			expect(categoryInput).toBeDisabled()
		})

		it('should show code as readonly', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			const codeInput = screen.getByDisplayValue(
				'CREA_PATRIMONIO-PROPIO-JUNIOR'
			)
			expect(codeInput).toBeDisabled()
		})

		it('should render save button', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			expect(screen.getByText('Guardar Cambios')).toBeInTheDocument()
		})

		it('should show loading state', () => {
			render(
				<ProductConfigurationForm {...defaultEditProps} isLoading={true} />
			)

			expect(screen.getByText('Guardando...')).toBeInTheDocument()
		})

		it('should render PPC section', () => {
			render(<ProductConfigurationForm {...defaultEditProps} />)

			expect(screen.getByText('Distribución de comisión')).toBeInTheDocument()
		})
	})
})
