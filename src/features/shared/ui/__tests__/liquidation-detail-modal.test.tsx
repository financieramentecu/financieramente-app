import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LiquidationDetailModal } from '../liquidation-detail-modal'
import { mockLiquidationDetails } from '@/features/shared/__tests__/fixtures/mockLiquidationData'

describe('LiquidationDetailModal', () => {
	const mockOnOpenChange = vi.fn()
	const mockOnEdit = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders modal with liquidation details', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByText('Detalle de Liquidación')).toBeInTheDocument()
	})

	it('displays status badge', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByText('Efectuada')).toBeInTheDocument()
	})

	it('displays client information', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByText('John Agudelo')).toBeInTheDocument()
		expect(screen.getByText('C.C. 1053')).toBeInTheDocument()
		expect(screen.getByText('john.agudelo@gmail.com')).toBeInTheDocument()
		expect(screen.getByText('+57 320 555 55 55')).toBeInTheDocument()
	})

	it('displays liquidation amount', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByText(/400.95/)).toBeInTheDocument()
		expect(screen.getByText(/usd/)).toBeInTheDocument()
	})

	it('displays agent information', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByText('Vanesa Cardona')).toBeInTheDocument()
		expect(screen.getByText('Agente')).toBeInTheDocument()
		expect(screen.getByText('vanesa.cardona@gmail.com')).toBeInTheDocument()
	})

	it('displays product information', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByText('Nombre producto')).toBeInTheDocument()
		expect(screen.getByText('Mayo 13, 025')).toBeInTheDocument()
		expect(screen.getByText(/Plazo/)).toBeInTheDocument()
	})

	it('displays insurance company information', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByText('Skandia')).toBeInTheDocument()
		expect(screen.getByText('PN0001265')).toBeInTheDocument()
	})

	it('renders edit button', () => {
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
			/>
		)

		expect(screen.getByRole('button', { name: /Editar/ })).toBeInTheDocument()
	})

	it('renders cancel button', () => {
		const mockOnCancel = vi.fn()
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		)

		expect(screen.getByRole('button', { name: /Cancelar/ })).toBeInTheDocument()
	})

	it('renders both edit and cancel buttons', () => {
		const mockOnCancel = vi.fn()
		render(
			<LiquidationDetailModal
				open={true}
				onOpenChange={mockOnOpenChange}
				liquidation={mockLiquidationDetails[0]}
				onEdit={mockOnEdit}
				onCancel={mockOnCancel}
			/>
		)

		expect(screen.getByRole('button', { name: /Cancelar/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Editar/ })).toBeInTheDocument()
	})
})
