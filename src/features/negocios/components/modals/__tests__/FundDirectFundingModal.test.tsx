import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FundDirectFundingModal } from '../FundDirectFundingModal'
import { createMockTableBusiness } from '../../../__tests__/fixtures/mock-business'

describe('FundDirectFundingModal', () => {
	it('renders the "Confirmar Fondeo" title and a date input when open', () => {
		render(
			<FundDirectFundingModal
				open
				onOpenChange={vi.fn()}
				business={createMockTableBusiness()}
				onConfirm={vi.fn()}
				isLoading={false}
			/>
		)

		expect(screen.getByText('Confirmar Fondeo')).toBeInTheDocument()
		expect(screen.getByLabelText('Fecha de fondeo')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		render(
			<FundDirectFundingModal
				open={false}
				onOpenChange={vi.fn()}
				business={createMockTableBusiness()}
				onConfirm={vi.fn()}
				isLoading={false}
			/>
		)

		expect(screen.queryByText('Confirmar Fondeo')).not.toBeInTheDocument()
	})

	it('calls onConfirm with the selected date when the user confirms', () => {
		const onConfirm = vi.fn()
		render(
			<FundDirectFundingModal
				open
				onOpenChange={vi.fn()}
				business={createMockTableBusiness()}
				onConfirm={onConfirm}
				isLoading={false}
			/>
		)

		fireEvent.change(screen.getByLabelText('Fecha de fondeo'), {
			target: { value: '2026-06-15' },
		})
		fireEvent.click(screen.getByText('Confirmar fondeo'))

		expect(onConfirm).toHaveBeenCalledWith('2026-06-15')
	})

	it('calls onOpenChange(false) on cancel without calling onConfirm', () => {
		const onConfirm = vi.fn()
		const onOpenChange = vi.fn()
		render(
			<FundDirectFundingModal
				open
				onOpenChange={onOpenChange}
				business={createMockTableBusiness()}
				onConfirm={onConfirm}
				isLoading={false}
			/>
		)

		fireEvent.click(screen.getByText('Cancelar'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('shows the error message when provided', () => {
		render(
			<FundDirectFundingModal
				open
				onOpenChange={vi.fn()}
				business={createMockTableBusiness()}
				onConfirm={vi.fn()}
				isLoading={false}
				error="La fecha de fondeo no puede ser futura"
			/>
		)

		expect(
			screen.getByText('La fecha de fondeo no puede ser futura')
		).toBeInTheDocument()
	})
})
