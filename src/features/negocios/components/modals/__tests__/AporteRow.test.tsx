import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AporteRow } from '../AporteRow'
import type { PaymentInstallmentDto } from '../../../types/business-api.types'

function baseAporte(
	overrides: Partial<PaymentInstallmentDto>
): PaymentInstallmentDto {
	return {
		installmentIndex: 1,
		status: 'FONDEADO',
		dateAnchored: null,
		expectedDate: '2025-05-01T00:00:00.000Z',
		portfolioDate: null,
		earlyPaymentDate: null,
		...overrides,
	}
}

const now = new Date(2025, 4, 15)

beforeEach(() => {
	vi.clearAllMocks()
})

describe('AporteRow', () => {
	it('renders action buttons for FONDEADO current month with canMutate=true', () => {
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({})}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()} onRequestAction={vi.fn()}
				/>
			</ul>
		)
		expect(screen.getByRole('button', { name: /cartera/i })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /pago anticipado/i })
		).toBeInTheDocument()
	})

	it('renders no action buttons for read-only role', () => {
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({})}
					businessId={10}
					canMutate={false}
					now={now}
					onTransitionSuccess={vi.fn()} onRequestAction={vi.fn()}
				/>
			</ul>
		)
		expect(
			screen.queryByRole('button', { name: /cartera/i })
		).not.toBeInTheDocument()
	})

	it('calls onRequestAction with UNMARK_CARTERA for EN_CARTERA and shows no Cartera/PagoAnticipado buttons', () => {
		const onRequestAction = vi.fn()
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({
						status: 'EN_CARTERA',
						portfolioDate: '2025-05-10T00:00:00.000Z',
					})}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={onRequestAction}
				/>
			</ul>
		)
		const quitarBtn = screen.getByRole('button', { name: /quitar de cartera/i })
		expect(quitarBtn).toBeInTheDocument()
		fireEvent.click(quitarBtn)
		expect(onRequestAction).toHaveBeenCalledWith('UNMARK_CARTERA', 1)
		expect(screen.queryByRole('button', { name: /^marcar como cartera$/i })).not.toBeInTheDocument()
	})

	it('calls onRequestAction with MARK_CARTERA when Cartera button is clicked', () => {
		const onRequestAction = vi.fn()
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({})}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={onRequestAction}
				/>
			</ul>
		)
		fireEvent.click(screen.getByRole('button', { name: /cartera/i }))
		expect(onRequestAction).toHaveBeenCalledWith('MARK_CARTERA', 1)
	})

	it('calls onRequestAction with MARK_ANTICIPADO when Pago Anticipado button is clicked', () => {
		const onRequestAction = vi.fn()
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({})}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={onRequestAction}
				/>
			</ul>
		)
		fireEvent.click(screen.getByRole('button', { name: /pago anticipado/i }))
		expect(onRequestAction).toHaveBeenCalledWith('MARK_ANTICIPADO', 1)
	})

	it('renders green row for PAGO_ANTICIPADO and shows label', () => {
		const { container } = render(
			<ul>
				<AporteRow
					aporte={baseAporte({
						status: 'PAGO_ANTICIPADO',
						earlyPaymentDate: '2025-05-12T00:00:00.000Z',
					})}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()} onRequestAction={vi.fn()}
				/>
			</ul>
		)
		expect(screen.getByText(/Pago anticipado/i)).toBeInTheDocument()
		expect(container.querySelector('.bg-green-50')).not.toBeNull()
	})
})
