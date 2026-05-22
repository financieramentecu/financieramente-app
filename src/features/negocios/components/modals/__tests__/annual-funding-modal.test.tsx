import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AnnualFundingModal } from '../AnnualFundingModal'

const pendingInstallment = {
	installmentIndex: 1,
	status: 'SIN_FONDEAR' as const,
	dateAnchored: null,
	expectedDate: null,
	portfolioDate: null,
	earlyPaymentDate: null,
}

describe('AnnualFundingModal', () => {
	const defaults = {
		open: true,
		onOpenChange: vi.fn(),
		businessId: 42,
		installments: [pendingInstallment],
		onConfirm: vi.fn(),
	}

	it('title includes contract when contractLabel is set', () => {
		render(
			<AnnualFundingModal {...defaults} contractLabel="PN-999" />
		)

		expect(
			screen.getByRole('heading', {
				name: /Fondear aportes · Contrato PN-999/i,
			})
		).toBeInTheDocument()
	})

	it('title falls back to Negocio #id when contract is empty', () => {
		render(
			<AnnualFundingModal
				{...defaults}
				contractLabel=""
				businessId={99}
			/>
		)

		expect(
			screen.getByRole('heading', {
				name: /Fondear aportes · Negocio #99/i,
			})
		).toBeInTheDocument()
	})

	it('renders pending row with checkbox and label', () => {
		render(<AnnualFundingModal {...defaults} />)

		expect(screen.getByRole('checkbox', { name: /Anualidad 1/i })).toBeInTheDocument()
		expect(screen.getByText('Pendiente de fondear')).toBeInTheDocument()
	})

	it('renders funded row without checkbox and shows dateAnchored', () => {
		const funded = {
			installmentIndex: 2,
			status: 'FONDEADO' as const,
			dateAnchored: '2025-03-15T10:00:00.000Z',
			expectedDate: null,
			portfolioDate: null,
			earlyPaymentDate: null,
		}
		render(<AnnualFundingModal {...defaults} installments={[funded]} />)

		expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
		expect(screen.getByText(/Fondeado/i)).toBeInTheDocument()
		expect(screen.getByText(/Anualidad 2/i)).toBeInTheDocument()
	})

	it('shows empty state when installments is empty', () => {
		render(<AnnualFundingModal {...defaults} installments={[]} />)

		expect(screen.getByText(/No hay cuotas anuales/i)).toBeInTheDocument()
	})
})
