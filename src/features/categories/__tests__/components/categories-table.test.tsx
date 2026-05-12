import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategoriesTableSection } from '../../components/categories-table'
import { createMockCategory } from '../fixtures/mock-category'

describe('CategoriesTableSection', () => {
	const defaultProps = {
		data: [],
		onAddCategory: vi.fn(),
		onGlobalSearch: vi.fn(),
		onEditCategory: vi.fn(),
		onDeleteCategory: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		it('should display category data in row', () => {
			const categories = [
				createMockCategory({
					id: 1,
					name: 'Categoría Test',
					categoryType: { name: 'Tipo A' },
				}),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getByText('Categoría Test')).toBeInTheDocument()
		})

		it('should display empty state when no data', () => {
			render(<CategoriesTableSection {...defaultProps} data={[]} />)

			expect(screen.getByText('No se encontraron resultados.')).toBeInTheDocument()
		})

		it('should display multiple categories', () => {
			const categories = [
				createMockCategory({ id: 1, name: 'Categoría A' }),
				createMockCategory({ id: 2, name: 'Categoría B' }),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getByText('Categoría A')).toBeInTheDocument()
			expect(screen.getByText('Categoría B')).toBeInTheDocument()
		})
	})

	describe('Column Headers', () => {
		it('should display name column header', () => {
			render(<CategoriesTableSection {...defaultProps} data={[]} />)

			expect(screen.getByText('Nombre')).toBeInTheDocument()
		})

		it('should display status column header', () => {
			render(<CategoriesTableSection {...defaultProps} data={[]} />)

			expect(screen.getByText('Estado')).toBeInTheDocument()
		})

		it('should display category type column header', () => {
			render(<CategoriesTableSection {...defaultProps} data={[]} />)

			expect(screen.getByText(/tipo/i)).toBeInTheDocument()
		})
	})

	describe('Category Type Display', () => {
		it('should display the categoryType name from relation', () => {
			const categories = [
				createMockCategory({
					id: 1,
					name: 'Categoría A',
					categoryType: { name: 'Tipo Especial' },
				}),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getByText('Tipo Especial')).toBeInTheDocument()
		})

		it('should display dash when categoryType is absent', () => {
			const categories = [
				createMockCategory({
					id: 1,
					name: 'Categoría A',
					categoryType: undefined,
				}),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getByText('—')).toBeInTheDocument()
		})
	})

	describe('Title and Actions', () => {
		it('should display table section title', () => {
			render(<CategoriesTableSection {...defaultProps} data={[]} />)

			expect(screen.getByText(/categorías/i)).toBeInTheDocument()
		})

		it('should display add button', () => {
			render(<CategoriesTableSection {...defaultProps} data={[]} />)

			expect(
				screen.getByRole('button', { name: /crear categoría/i })
			).toBeInTheDocument()
		})
	})
})
