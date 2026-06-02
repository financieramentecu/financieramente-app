import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AporteRow } from '../AporteRow'
import type { PaymentInstallmentDto } from '../../../types/business-api.types'

const emitidoBusiness = { status: 'EMITIDO', dateAnchored: null }
const fondeadoBusiness = { status: 'FONDEADO', dateAnchored: '2024-01-15T00:00:00.000Z' }

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
		portfolioPaymentDate: null,
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

	it('renders CARTERA_PAGADO with green styling, date label, and no buttons', () => {
		const { container } = render(
			<ul>
				<AporteRow
					aporte={baseAporte({
						status: 'CARTERA_PAGADO',
						portfolioPaymentDate: '2025-05-20T00:00:00.000Z',
					})}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={vi.fn()}
				/>
			</ul>
		)
		expect(screen.getByText(/Cartera pagada/i)).toBeInTheDocument()
		expect(container.querySelector('.bg-green-50')).not.toBeNull()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})

	it('renders CARTERA_PAGADO with no buttons even for read-only role', () => {
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({
						status: 'CARTERA_PAGADO',
						portfolioPaymentDate: '2025-05-20T00:00:00.000Z',
					})}
					businessId={10}
					canMutate={false}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={vi.fn()}
				/>
			</ul>
		)
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
		expect(screen.getByText(/Cartera pagada/i)).toBeInTheDocument()
	})

	describe('MARK_FONDEAR button (business-level gate)', () => {
		it('renders Fondear button when business=EMITIDO, no dateAnchored, installmentIndex=1, canMutate=true', () => {
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({ installmentIndex: 1 })}
						businessId={10}
						business={emitidoBusiness}
						canMutate={true}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={vi.fn()}
					/>
				</ul>
			)
			expect(screen.getByRole('button', { name: /fondear/i })).toBeInTheDocument()
		})

		it('does NOT render Fondear button when business=FONDEADO', () => {
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({ installmentIndex: 1 })}
						businessId={10}
						business={fondeadoBusiness}
						canMutate={true}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={vi.fn()}
					/>
				</ul>
			)
			expect(screen.queryByRole('button', { name: /fondear/i })).not.toBeInTheDocument()
		})

		it('does NOT render Fondear button when installmentIndex=2', () => {
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({ installmentIndex: 2, expectedDate: '2025-05-01T00:00:00.000Z' })}
						businessId={10}
						business={emitidoBusiness}
						canMutate={true}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={vi.fn()}
					/>
				</ul>
			)
			expect(screen.queryByRole('button', { name: /fondear/i })).not.toBeInTheDocument()
		})

		it('calls onRequestAction with MARK_FONDEAR when Fondear button is clicked', () => {
			const onRequestAction = vi.fn()
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({ installmentIndex: 1 })}
						businessId={10}
						business={emitidoBusiness}
						canMutate={true}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={onRequestAction}
					/>
				</ul>
			)
			fireEvent.click(screen.getByRole('button', { name: /fondear/i }))
			expect(onRequestAction).toHaveBeenCalledWith('MARK_FONDEAR', 1)
		})
	})
})
