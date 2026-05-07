import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategoriesTableSection } from '../../components/categories-table'
import {
	createMockCategory,
} from '../fixtures/mock-category'

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
		it('should render table with data (happy path)', () => {
			const categories = [
				createMockCategory({
					idCategory: 1,
					code: 'CAT001',
					name: 'Agente MMS',
				}),
				createMockCategory({
					idCategory: 2,
					code: 'CAT002',
					name: 'Agente Aliado',
				}),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getByText('CAT001')).toBeInTheDocument()
			expect(screen.getByText('Agente MMS')).toBeInTheDocument()
			expect(screen.getByText('CAT002')).toBeInTheDocument()
			expect(screen.getByText('Agente Aliado')).toBeInTheDocument()
		})

		it('should display all columns correctly', () => {
			const categories = [createMockCategory()]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			// Check column headers
			expect(screen.getByText('Código')).toBeInTheDocument()
			expect(screen.getByText('Nombre')).toBeInTheDocument()
			expect(screen.getByText('Tipo')).toBeInTheDocument()
			expect(screen.getByText('Descripción')).toBeInTheDocument()
			expect(screen.getByText('Estado')).toBeInTheDocument()
			expect(screen.getByText('Fecha Creación')).toBeInTheDocument()
			expect(screen.getByText('Acciones')).toBeInTheDocument()
		})

		it('should display category data in row', () => {
			const categories = [
				createMockCategory({
					code: 'TEST123',
					name: 'Test Category',
					descripcion: 'Test description',
				}),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getByText('TEST123')).toBeInTheDocument()
			expect(screen.getByText('Test Category')).toBeInTheDocument()
		})

		it('should display empty state when no data', () => {
			render(<CategoriesTableSection {...defaultProps} data={[]} />)

			expect(screen.getByText('No se encontraron resultados.')).toBeInTheDocument()
		})
	})

	describe('Multiple Types Display', () => {
		it('should display all category types correctly', () => {
			const categories = [
				createMockCategory({ code: 'CAT-MMS', typeCategory: 'MMS' }),
				createMockCategory({ code: 'CAT-ALIADO', typeCategory: 'ALIADO' }),
				createMockCategory({ code: 'CAT-TRINITY', typeCategory: 'TRINITY' }),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			// Check that all codes are displayed
			expect(screen.getByText('CAT-MMS')).toBeInTheDocument()
			expect(screen.getByText('CAT-ALIADO')).toBeInTheDocument()
			expect(screen.getByText('CAT-TRINITY')).toBeInTheDocument()
		})

		it('should display type labels in table', () => {
			const categories = [
				createMockCategory({ code: 'CAT-MMS', typeCategory: 'MMS' }),
				createMockCategory({ code: 'CAT-ALIADO', typeCategory: 'Aliado' }),
				createMockCategory({ code: 'CAT-TRINITY', typeCategory: 'Trinity' }),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getAllByText('MMS')[0]).toBeInTheDocument()
			expect(screen.getAllByText('Aliado')[0]).toBeInTheDocument()
			expect(screen.getAllByText('Trinity')[0]).toBeInTheDocument()
		})
	})

	describe('Hierarchy — Batch 2 specs', () => {
		it('(5.3a) color chip column renders with correct hex color', () => {
			const categories = [
				createMockCategory({ idCategory: 1, color: '#10b981', name: 'MS Junior' }),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			// Color chip header
			expect(screen.getByText('Color')).toBeInTheDocument()
			// Color chip element with the hex color as background/fill
			const chip = document.querySelector('[data-testid="color-chip"]')
			expect(chip).toBeInTheDocument()
			expect(chip).toHaveStyle({ backgroundColor: '#10b981' })
		})

		it('(5.3b) next-category name column renders category name', () => {
			const categories = [
				createMockCategory({
					idCategory: 1,
					name: 'MS Junior',
					nextCategory: { id: 2, name: 'MS Senior' },
				}),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getAllByText('Siguiente')[0]).toBeInTheDocument()
			expect(screen.getByText('MS Senior')).toBeInTheDocument()
		})

		it('(5.3b) next-category name column renders "—" when null', () => {
			const categories = [
				createMockCategory({
					idCategory: 1,
					name: 'Partner',
					nextCategory: null,
				}),
			]

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			expect(screen.getAllByText('Siguiente')[0]).toBeInTheDocument()
			expect(screen.getByText('—')).toBeInTheDocument()
		})
	})
})
