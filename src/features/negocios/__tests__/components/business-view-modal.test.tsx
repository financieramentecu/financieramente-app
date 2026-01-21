import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BusinessViewModal } from '../../components/modals/BusinessViewModal'
import { createMockBusiness } from '../fixtures/mock-business'

describe('BusinessViewModal', () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		business: createMockBusiness(),
	}

	describe('Happy Path', () => {
		it('should render business ID in title', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText(/Negocio #1/)).toBeInTheDocument()
		})

		it('should display client information', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('María García López')).toBeInTheDocument()
			expect(screen.getByText('1234567890')).toBeInTheDocument()
			expect(screen.getByText('maria.garcia@email.com')).toBeInTheDocument()
		})

		it('should display product information', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('Crédito Personal')).toBeInTheDocument()
			expect(screen.getByText('Skandia')).toBeInTheDocument()
		})

		it('should display agent information', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('Carlos Agente Pérez')).toBeInTheDocument()
			expect(screen.getByText('Agente/Coach')).toBeInTheDocument()
		})

		it('should show status badge', () => {
			const business = createMockBusiness({ status: 'EMITIDO' })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			expect(screen.getByText('Emitido')).toBeInTheDocument()
		})

		it('should format currency value', () => {
			render(<BusinessViewModal {...defaultProps} />)

			// Verifica que muestra el valor formateado (COP)
			expect(screen.getByText(/15.*000.*000/)).toBeInTheDocument()
		})

		it('should call onOpenChange when close button clicked', () => {
			const onOpenChange = vi.fn()
			render(
				<BusinessViewModal {...defaultProps} onOpenChange={onOpenChange} />
			)

			fireEvent.click(screen.getByRole('button', { name: /Cerrar/i }))

			expect(onOpenChange).toHaveBeenCalledWith(false)
		})

		it('should display term with months label', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('12 meses')).toBeInTheDocument()
		})

		it('should display periodicity', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText('Mensual')).toBeInTheDocument()
		})

		it('should display client origin', () => {
			render(<BusinessViewModal {...defaultProps} />)

			expect(screen.getByText(/Referido/)).toBeInTheDocument()
		})
	})

	describe('Flujos Alternos', () => {
		it('should show "Sin asignar" when contract is null', () => {
			const business = createMockBusiness({ contract: null })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			expect(screen.getByText('Sin asignar')).toBeInTheDocument()
		})

		it('should not render when business is null', () => {
			render(<BusinessViewModal {...defaultProps} business={null} />)

			expect(screen.queryByText(/Negocio #/)).not.toBeInTheDocument()
		})

		it('should handle missing periodicity', () => {
			const business = createMockBusiness({ periodicity: null })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			// Busca el guión que indica "no disponible"
			const periodicityElements = screen.getAllByText('-')
			expect(periodicityElements.length).toBeGreaterThan(0)
		})

		it('should handle missing term', () => {
			const business = createMockBusiness({ term: null })
			render(<BusinessViewModal {...defaultProps} business={business} />)

			// Busca el guión que indica "no disponible"
			const termElements = screen.getAllByText('-')
			expect(termElements.length).toBeGreaterThan(0)
		})

		it('should show loading skeleton when isLoading', () => {
			render(<BusinessViewModal {...defaultProps} isLoading={true} />)

			expect(screen.getByText('Cargando...')).toBeInTheDocument()
		})

		it('should not render when open is false', () => {
			render(<BusinessViewModal {...defaultProps} open={false} />)

			expect(screen.queryByText(/Negocio #/)).not.toBeInTheDocument()
		})
	})
})
