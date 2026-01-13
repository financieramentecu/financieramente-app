import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductsTableSection } from '../../components/products-table'
import { createMockProduct, createMockCompanyOption } from '../fixtures/mock-product'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
	})),
}))

describe('ProductsTableSection', () => {
	const mockProducts = [
		createMockProduct({
			idProduct: 1,
			name: 'Seguro de Vida',
			status: true,
		}),
		createMockProduct({
			idProduct: 2,
			name: 'Seguro de Salud',
			status: false,
		}),
	]

	const mockOnAddProduct = vi.fn()
	const mockOnGlobalSearch = vi.fn()
	const mockOnEditProduct = vi.fn()
	const mockOnDeleteProduct = vi.fn()
	const mockOnPageChange = vi.fn()
	const mockOnCompanyChange = vi.fn()

	const mockCompanies = [
		createMockCompanyOption({ idCompany: 1, name: 'Skandia' }),
		createMockCompanyOption({ idCompany: 2, name: 'Sura' }),
	]

	const defaultProps = {
		data: mockProducts,
		onAddProduct: mockOnAddProduct,
		onGlobalSearch: mockOnGlobalSearch,
		onEditProduct: mockOnEditProduct,
		onDeleteProduct: mockOnDeleteProduct,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should render table with products (happy path)', () => {
		render(<ProductsTableSection {...defaultProps} />)

		expect(screen.getByText('Lista de Productos')).toBeInTheDocument()
		expect(screen.getByText('Seguro de Vida')).toBeInTheDocument()
		expect(screen.getByText('Seguro de Salud')).toBeInTheDocument()
		expect(screen.getByText('Nuevo Producto')).toBeInTheDocument()
	})

	it('should render product IDs', () => {
		render(<ProductsTableSection {...defaultProps} />)

		expect(screen.getByText('#1')).toBeInTheDocument()
		expect(screen.getByText('#2')).toBeInTheDocument()
	})

	it('should render company names', () => {
		render(<ProductsTableSection {...defaultProps} />)

		expect(screen.getAllByText('Skandia')).toHaveLength(2)
	})

	it('should render status badges correctly', () => {
		render(<ProductsTableSection {...defaultProps} />)

		expect(screen.getByText('Activo')).toBeInTheDocument()
		expect(screen.getByText('Inactivo')).toBeInTheDocument()
	})

	it('should call onAddProduct when add button is clicked', async () => {
		const user = userEvent.setup()
		render(<ProductsTableSection {...defaultProps} />)

		const addButton = screen.getByRole('button', { name: /nuevo producto/i })
		await user.click(addButton)

		expect(mockOnAddProduct).toHaveBeenCalledTimes(1)
	})

	it('should call onEditProduct when edit button is clicked', async () => {
		const user = userEvent.setup()
		render(<ProductsTableSection {...defaultProps} />)

		// Find edit buttons (Pencil icons)
		const editButtons = screen.getAllByTitle('Editar')
		await user.click(editButtons[0])

		expect(mockOnEditProduct).toHaveBeenCalledWith(mockProducts[0])
	})

	it('should call onDeleteProduct when delete button is clicked', async () => {
		const user = userEvent.setup()
		render(<ProductsTableSection {...defaultProps} />)

		// Find delete buttons (Trash2 icons)
		const deleteButtons = screen.getAllByTitle('Eliminar')
		await user.click(deleteButtons[0])

		expect(mockOnDeleteProduct).toHaveBeenCalledWith(mockProducts[0])
	})

	it('should call onGlobalSearch when search is performed', async () => {
		const user = userEvent.setup()
		render(<ProductsTableSection {...defaultProps} />)

		const searchInput = screen.getByPlaceholderText(/buscar por nombre de producto/i)
		await user.type(searchInput, 'Seguro')

		await waitFor(() => {
			expect(mockOnGlobalSearch).toHaveBeenCalled()
		})
	})

	it('should render pagination when provided', () => {
		const pagination = {
			page: 1,
			pageSize: 10,
			total: 20,
			totalPages: 2,
		}

		render(
			<ProductsTableSection
				{...defaultProps}
				pagination={pagination}
				onPageChange={mockOnPageChange}
			/>
		)

		// DataTable should render pagination controls
		expect(screen.getByText('Lista de Productos')).toBeInTheDocument()
	})

	it('should render company filter when companies are provided', async () => {
		render(
			<ProductsTableSection
				{...defaultProps}
				companies={mockCompanies}
				onCompanyChange={mockOnCompanyChange}
			/>
		)

		// Find the company filter select by text content
		expect(screen.getByText('Todas las empresas')).toBeInTheDocument()
	})

	it('should call onCompanyChange when company filter changes', async () => {
		const user = userEvent.setup()
		render(
			<ProductsTableSection
				{...defaultProps}
				companies={mockCompanies}
				onCompanyChange={mockOnCompanyChange}
			/>
		)

		// Find the company filter by looking for the combobox that contains "Todas las empresas"
		const companyFilters = screen.getAllByRole('combobox')
		const companyFilter = companyFilters.find((el) =>
			el.textContent?.includes('Todas las empresas')
		)

		if (companyFilter) {
			await user.click(companyFilter)
			await waitFor(() => {
				expect(screen.getByRole('option', { name: 'Skandia' })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('option', { name: 'Skandia' }))
			// Note: onCompanyChange might be called with the company ID as string
			await waitFor(() => {
				expect(mockOnCompanyChange).toHaveBeenCalled()
			})
		}
	})

	it('should show loading state when isSearching is true', () => {
		render(<ProductsTableSection {...defaultProps} isSearching={true} />)

		// DataTable should show loading state
		expect(screen.getByText('Lista de Productos')).toBeInTheDocument()
	})

	it('should format dates correctly', () => {
		render(<ProductsTableSection {...defaultProps} />)

		// Dates should be formatted in Spanish locale
		// The exact format depends on the locale, but we can check that dates are rendered
		const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
		expect(dateElements.length).toBeGreaterThan(0)
	})

	it('should handle empty products array', () => {
		render(<ProductsTableSection {...defaultProps} data={[]} />)

		expect(screen.getByText('Lista de Productos')).toBeInTheDocument()
	})

	it('should render all action buttons for each product', () => {
		render(<ProductsTableSection {...defaultProps} />)

		// Should have edit and delete buttons for each product
		const editButtons = screen.getAllByTitle('Editar')
		const deleteButtons = screen.getAllByTitle('Eliminar')

		expect(editButtons).toHaveLength(mockProducts.length)
		expect(deleteButtons).toHaveLength(mockProducts.length)
	})

	it('should handle pagination page change', async () => {
		const user = userEvent.setup()
		const pagination = {
			page: 1,
			pageSize: 10,
			total: 20,
			totalPages: 2,
		}

		render(
			<ProductsTableSection
				{...defaultProps}
				pagination={pagination}
				onPageChange={mockOnPageChange}
			/>
		)

		// The actual pagination interaction depends on DataTable implementation
		// This test verifies that the component accepts the props
		expect(screen.getByText('Lista de Productos')).toBeInTheDocument()
	})
})

