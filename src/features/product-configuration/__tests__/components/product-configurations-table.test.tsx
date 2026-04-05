import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProductConfigurationsTableSection } from '../../components/product-configurations-table'
import { createMockProductConfiguration } from '../fixtures/mock-product-configuration'

describe('ProductConfigurationsTableSection', () => {
	const defaultProps = {
		data: [createMockProductConfiguration()],
		onAddConfiguration: vi.fn(),
		onGlobalSearch: vi.fn(),
		onEditConfiguration: vi.fn(),
		onToggleActive: vi.fn(),
	}

	it('should render the table header', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(
			screen.getByText('Configuraciones de Producto')
		).toBeInTheDocument()
	})

	it('should render the create button', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(
			screen.getByText('Crear Configuración')
		).toBeInTheDocument()
	})

	it('should render configuration code', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(
			screen.getByText('CREA_PATRIMONIO-PROPIO-JUNIOR')
		).toBeInTheDocument()
	})

	it('should render product name', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(
			screen.getByText('Crea Patrimonio')
		).toBeInTheDocument()
	})

	it('should render company name', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(screen.getByText('Empresa Test')).toBeInTheDocument()
	})

	it('should render client origin name', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(screen.getByText('Propio')).toBeInTheDocument()
	})

	it('should render category name', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(screen.getByText('Junior')).toBeInTheDocument()
	})

	it('should render active switch', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(screen.getByLabelText('Desactivar producto')).toBeInTheDocument()
	})

	it('should render inactive switch', () => {
		const inactiveConfig = createMockProductConfiguration({
			active: false,
		})
		render(
			<ProductConfigurationsTableSection
				{...defaultProps}
				data={[inactiveConfig]}
			/>
		)

		expect(screen.getByLabelText('Activar producto')).toBeInTheDocument()
	})

	it('should render multiple configurations', () => {
		const configs = [
			createMockProductConfiguration({
				id: 1,
				code: 'CODE-A',
			}),
			createMockProductConfiguration({
				id: 2,
				code: 'CODE-B',
			}),
		]

		render(
			<ProductConfigurationsTableSection
				{...defaultProps}
				data={configs}
			/>
		)

		expect(screen.getByText('CODE-A')).toBeInTheDocument()
		expect(screen.getByText('CODE-B')).toBeInTheDocument()
	})

	it('should render search placeholder', () => {
		render(<ProductConfigurationsTableSection {...defaultProps} />)

		expect(
			screen.getByPlaceholderText(
				'Buscar por código, producto, origen o categoría...'
			)
		).toBeInTheDocument()
	})
})
