import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LevelsTableSection } from '../../components/levels-table'
import {
	createMockLevel,
} from '../fixtures/mock-level'

describe('LevelsTableSection', () => {
	const defaultProps = {
		data: [],
		onAddLevel: vi.fn(),
		onGlobalSearch: vi.fn(),
		onEditLevel: vi.fn(),
		onDeleteLevel: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		it('should render table with data (happy path)', () => {
			const levels = [
				createMockLevel({
					idLevel: 1,
					code: 'LEVEL001',
					name: 'Agente MMS',
				}),
				createMockLevel({
					idLevel: 2,
					code: 'LEVEL002',
					name: 'Agente Aliado',
				}),
			]

			render(<LevelsTableSection {...defaultProps} data={levels} />)

			expect(screen.getByText('LEVEL001')).toBeInTheDocument()
			expect(screen.getByText('Agente MMS')).toBeInTheDocument()
			expect(screen.getByText('LEVEL002')).toBeInTheDocument()
			expect(screen.getByText('Agente Aliado')).toBeInTheDocument()
		})

		it('should display all columns correctly', () => {
			const levels = [createMockLevel()]

			render(<LevelsTableSection {...defaultProps} data={levels} />)

			expect(screen.getByText('Código')).toBeInTheDocument()
			expect(screen.getByText('Nombre')).toBeInTheDocument()
			expect(screen.getByText('Tipo')).toBeInTheDocument()
			expect(screen.getByText('Descripción')).toBeInTheDocument()
			expect(screen.getByText('Estado')).toBeInTheDocument()
			expect(screen.getByText('Fecha Creación')).toBeInTheDocument()
			expect(screen.getByText('Acciones')).toBeInTheDocument()
		})

		it('should display level data in row', () => {
			const levels = [
				createMockLevel({
					code: 'TEST123',
					name: 'Test Level',
					descripcion: 'Test description',
				}),
			]

			render(<LevelsTableSection {...defaultProps} data={levels} />)

			expect(screen.getByText('TEST123')).toBeInTheDocument()
			expect(screen.getByText('Test Level')).toBeInTheDocument()
		})

		it('should display empty state when no data', () => {
			render(<LevelsTableSection {...defaultProps} data={[]} />)

			expect(screen.getByText('No se encontraron resultados.')).toBeInTheDocument()
		})
	})

	describe('Multiple Types Display', () => {
		it('should display all level types correctly', () => {
			const levels = [
				createMockLevel({ code: 'LEVEL-MMS', typeLevel: 'MMS' }),
				createMockLevel({ code: 'LEVEL-ALIADO', typeLevel: 'ALIADO' }),
				createMockLevel({ code: 'LEVEL-TRINITY', typeLevel: 'TRINITY' }),
			]

			render(<LevelsTableSection {...defaultProps} data={levels} />)

			expect(screen.getByText('LEVEL-MMS')).toBeInTheDocument()
			expect(screen.getByText('LEVEL-ALIADO')).toBeInTheDocument()
			expect(screen.getByText('LEVEL-TRINITY')).toBeInTheDocument()
		})
	})

	describe('Hierarchy specs', () => {
		it('color chip column renders with correct hex color', () => {
			const levels = [
				createMockLevel({ idLevel: 1, color: '#10b981', name: 'MS Junior' }),
			]

			render(<LevelsTableSection {...defaultProps} data={levels} />)

			expect(screen.getByText('Color')).toBeInTheDocument()
			const chip = document.querySelector('[data-testid="color-chip"]')
			expect(chip).toBeInTheDocument()
			expect(chip).toHaveStyle({ backgroundColor: '#10b981' })
		})

		it('next-level name column renders level name', () => {
			const levels = [
				createMockLevel({
					idLevel: 1,
					name: 'MS Junior',
					nextLevel: { id: 2, name: 'MS Senior' },
				}),
			]

			render(<LevelsTableSection {...defaultProps} data={levels} />)

			expect(screen.getAllByText('Siguiente')[0]).toBeInTheDocument()
			expect(screen.getByText('MS Senior')).toBeInTheDocument()
		})

		it('next-level name column renders "—" when null', () => {
			const levels = [
				createMockLevel({
					idLevel: 1,
					name: 'Partner',
					nextLevel: null,
				}),
			]

			render(<LevelsTableSection {...defaultProps} data={levels} />)

			expect(screen.getAllByText('Siguiente')[0]).toBeInTheDocument()
			expect(screen.getByText('—')).toBeInTheDocument()
		})
	})
})
