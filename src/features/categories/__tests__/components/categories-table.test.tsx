import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategoriesTableSection } from '../../components/categories-table'
import {
	createMockCategory,
	createMockCategoriesByType,
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

			expect(screen.getByText('No se encontraron datos')).toBeInTheDocument()
		})
	})

	describe('Multiple Types Display', () => {
		it('should display all category types correctly', () => {
			const categories = createMockCategoriesByType()

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			// Check that all codes are displayed
			expect(screen.getByText('MMS001')).toBeInTheDocument()
			expect(screen.getByText('ALI001')).toBeInTheDocument()
			expect(screen.getByText('TRI001')).toBeInTheDocument()
		})

		it('should display type labels in table', () => {
			const categories = createMockCategoriesByType()

			render(<CategoriesTableSection {...defaultProps} data={categories} />)

			// Check type labels are shown (mapped from values)
			expect(screen.getByText('MMS')).toBeInTheDocument()
			expect(screen.getByText('Aliado')).toBeInTheDocument()
			expect(screen.getByText('Trinity')).toBeInTheDocument()
		})
	})
})
