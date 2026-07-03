import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FundingModal } from '../FundingModal'
import type { PaymentInstallmentDto } from '../../../types/business-api.types'
import { canFundPayments } from '@/features/auth/lib/roles'

// Mock hooks used inside FundingModal
vi.mock('../../../hooks/use-aporte-transitions', () => ({
	useAporteTransitions: () => ({
		markCartera: vi.fn(),
		markPagoAnticipado: vi.fn(),
		markCarteraPagado: vi.fn(),
	}),
}))

vi.mock('@/features/auth/lib/roles', () => ({
	canFundPayments: vi.fn(() => true),
}))

// Mock FundFirstPaymentDialog so we can control its behavior in tests
vi.mock('../FundFirstPaymentDialog', () => ({
	FundFirstPaymentDialog: ({
		open,
		onSuccess,
		onCancel,
	}: {
		open: boolean
		onSuccess: (business: unknown) => void
		onCancel: () => void
	}) => {
		if (!open) return null
		return (
			<div data-testid="fund-first-payment-dialog">
				<button onClick={() => onSuccess({ idBusiness: 10, status: 'FONDEADO' })}>
					Confirm Fund
				</button>
				<button onClick={onCancel}>Cancel</button>
			</div>
		)
	},
}))

function makeSinFondearInstallment1(): PaymentInstallmentDto {
	return {
		installmentIndex: 1,
		status: 'SIN_FONDEAR',
		dateAnchored: null,
		expectedDate: null,
		portfolioDate: null,
		earlyPaymentDate: null,
		portfolioPaymentDate: null,
	}
}

function makeFondeadoInstallment2(): PaymentInstallmentDto {
	return {
		installmentIndex: 2,
		status: 'FONDEADO',
		dateAnchored: '2026-06-15T12:00:00.000Z',
		expectedDate: '2026-06-01T00:00:00.000Z',
		portfolioDate: null,
		earlyPaymentDate: null,
		portfolioPaymentDate: null,
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(canFundPayments).mockReturnValue(true)
})

describe('FundingModal — FONDEAR button for installment 1 SIN_FONDEAR', () => {
	it('shows "Fondear" button for installment 1 SIN_FONDEAR when canMutate=true (ADMIN)', () => {
		render(
			<FundingModal
				open={true}
				onOpenChange={vi.fn()}
				businessId={10}
				installments={[makeSinFondearInstallment1()]}
				roleCode="ADMIN"
			/>
		)
		expect(screen.getByRole('button', { name: /fondear primer aporte/i })).toBeInTheDocument()
	})

	it('does NOT show Fondear button when canFundPayments returns false (AGENTE)', () => {
		vi.mocked(canFundPayments).mockReturnValue(false)

		render(
			<FundingModal
				open={true}
				onOpenChange={vi.fn()}
				businessId={10}
				installments={[makeSinFondearInstallment1()]}
				roleCode="AGENTE"
			/>
		)
		expect(screen.queryByRole('button', { name: /fondear primer aporte/i })).not.toBeInTheDocument()
	})

	it('clicking FONDEAR opens FundFirstPaymentDialog', () => {
		render(
			<FundingModal
				open={true}
				onOpenChange={vi.fn()}
				businessId={10}
				installments={[makeSinFondearInstallment1()]}
				roleCode="ADMIN"
			/>
		)

		fireEvent.click(screen.getByRole('button', { name: /fondear primer aporte/i }))
		expect(screen.getByTestId('fund-first-payment-dialog')).toBeInTheDocument()
	})

	it('FundFirstPaymentDialog success updates installment list', async () => {
		const onOpenChange = vi.fn()
		render(
			<FundingModal
				open={true}
				onOpenChange={onOpenChange}
				businessId={10}
				installments={[makeSinFondearInstallment1(), makeFondeadoInstallment2()]}
				roleCode="ADMIN"
			/>
		)

		// Open the dialog
		fireEvent.click(screen.getByRole('button', { name: /fondear primer aporte/i }))
		expect(screen.getByTestId('fund-first-payment-dialog')).toBeInTheDocument()

		// Simulate success — the dialog closes
		fireEvent.click(screen.getByText('Confirm Fund'))

		await waitFor(() => {
			expect(screen.queryByTestId('fund-first-payment-dialog')).not.toBeInTheDocument()
		})
	})
})
