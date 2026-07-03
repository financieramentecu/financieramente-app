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
		portfolioPaymentDate: null,
		...overrides,
	}
}

const now = new Date(2025, 4, 15)

beforeEach(() => {
	vi.clearAllMocks()
})

describe('AporteRow', () => {
	it('renders Marcar Cartera button for FONDEADO current month with canMutate=true', () => {
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({ installmentIndex: 2 })}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()} onRequestAction={vi.fn()}
				/>
			</ul>
		)
		// Same month → only MARK_CARTERA, NOT MARK_ANTICIPADO
		expect(screen.getByRole('button', { name: /cartera/i })).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: /pago anticipado/i })
		).not.toBeInTheDocument()
	})

	it('renders both Cartera and Pago Anticipado buttons for SIN_FONDEAR strictly future month (index 2)', () => {
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({ installmentIndex: 2, status: 'SIN_FONDEAR', dateAnchored: null, expectedDate: '2025-07-01T00:00:00.000Z' })}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()} onRequestAction={vi.fn()}
				/>
			</ul>
		)
		// Strictly future month → both buttons
		expect(screen.getByRole('button', { name: /cartera/i })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /pago anticipado/i })
		).toBeInTheDocument()
	})

	it('renders FONDEAR button for SIN_FONDEAR installment 1 with canMutate=true', () => {
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({ installmentIndex: 1, status: 'SIN_FONDEAR', dateAnchored: null, expectedDate: null })}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()} onRequestAction={vi.fn()}
					installmentIndex={1}
					isBusinessEmitido={false}
				/>
			</ul>
		)
		expect(screen.getByRole('button', { name: /fondear primer aporte/i })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /cartera/i })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /pago anticipado/i })).not.toBeInTheDocument()
	})

	it('does NOT render FONDEAR button for SIN_FONDEAR installment 1 with canMutate=false', () => {
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({ installmentIndex: 1, status: 'SIN_FONDEAR', dateAnchored: null, expectedDate: null })}
					businessId={10}
					canMutate={false}
					now={now}
					onTransitionSuccess={vi.fn()} onRequestAction={vi.fn()}
				/>
			</ul>
		)
		expect(screen.queryByRole('button', { name: /fondear primer aporte/i })).not.toBeInTheDocument()
	})

	it('calls onRequestAction with FONDEAR and installment 1 index when Fondear button is clicked', () => {
		const onRequestAction = vi.fn()
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({ installmentIndex: 1, status: 'SIN_FONDEAR', dateAnchored: null, expectedDate: null })}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={onRequestAction}
					installmentIndex={1}
					isBusinessEmitido={false}
				/>
			</ul>
		)
		fireEvent.click(screen.getByRole('button', { name: /fondear primer aporte/i }))
		expect(onRequestAction).toHaveBeenCalledWith('FONDEAR', 1)
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

	it('calls onRequestAction with MARK_CARTERA when Cartera button is clicked (FONDEADO index=2)', () => {
		const onRequestAction = vi.fn()
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({ installmentIndex: 2 })}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={onRequestAction}
				/>
			</ul>
		)
		fireEvent.click(screen.getByRole('button', { name: /cartera/i }))
		expect(onRequestAction).toHaveBeenCalledWith('MARK_CARTERA', 2)
	})

	it('calls onRequestAction with MARK_ANTICIPADO when Pago Anticipado button is clicked for SIN_FONDEAR future month (index=2)', () => {
		const onRequestAction = vi.fn()
		render(
			<ul>
				<AporteRow
					aporte={baseAporte({ installmentIndex: 2, status: 'SIN_FONDEAR', dateAnchored: null, expectedDate: '2025-07-01T00:00:00.000Z' })}
					businessId={10}
					canMutate={true}
					now={now}
					onTransitionSuccess={vi.fn()}
					onRequestAction={onRequestAction}
				/>
			</ul>
		)
		fireEvent.click(screen.getByRole('button', { name: /pago anticipado/i }))
		expect(onRequestAction).toHaveBeenCalledWith('MARK_ANTICIPADO', 2)
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

	describe('edit funded date affordance (pencil button)', () => {
		it('renders pencil edit button for FONDEADO past month when canMutate=true', () => {
			// Past month = expectedDate in April (before now=May 2025)
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({
							installmentIndex: 2,
							status: 'FONDEADO',
							dateAnchored: '2025-04-10T12:00:00.000Z',
							expectedDate: '2025-04-01T00:00:00.000Z',
						})}
						businessId={10}
						canMutate={true}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={vi.fn()}
						onEditFundedDate={vi.fn()}
					/>
				</ul>
			)
			expect(
				screen.getByRole('button', { name: /editar fecha de fondeo/i })
			).toBeInTheDocument()
		})

		it('renders pencil edit button for FONDEADO current month when canMutate=true', () => {
			// Current month = expectedDate in May 2025 (same as now)
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({
							installmentIndex: 2,
							status: 'FONDEADO',
							dateAnchored: '2025-05-10T12:00:00.000Z',
							expectedDate: '2025-05-01T00:00:00.000Z',
						})}
						businessId={10}
						canMutate={true}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={vi.fn()}
						onEditFundedDate={vi.fn()}
					/>
				</ul>
			)
			expect(
				screen.getByRole('button', { name: /editar fecha de fondeo/i })
			).toBeInTheDocument()
		})

		it('does NOT render pencil edit button when canMutate=false (AGENTE/COACH)', () => {
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({
							installmentIndex: 2,
							status: 'FONDEADO',
							dateAnchored: '2025-04-10T12:00:00.000Z',
							expectedDate: '2025-04-01T00:00:00.000Z',
						})}
						businessId={10}
						canMutate={false}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={vi.fn()}
						onEditFundedDate={vi.fn()}
					/>
				</ul>
			)
			expect(
				screen.queryByRole('button', { name: /editar fecha de fondeo/i })
			).not.toBeInTheDocument()
		})

		it('does NOT render pencil edit button for EN_CARTERA variant', () => {
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
						onRequestAction={vi.fn()}
						onEditFundedDate={vi.fn()}
					/>
				</ul>
			)
			expect(
				screen.queryByRole('button', { name: /editar fecha de fondeo/i })
			).not.toBeInTheDocument()
		})

		it('calls onEditFundedDate with index when pencil button is clicked', () => {
			const onEditFundedDate = vi.fn()
			render(
				<ul>
					<AporteRow
						aporte={baseAporte({
							installmentIndex: 3,
							status: 'FONDEADO',
							dateAnchored: '2025-04-10T12:00:00.000Z',
							expectedDate: '2025-04-01T00:00:00.000Z',
						})}
						businessId={10}
						canMutate={true}
						now={now}
						onTransitionSuccess={vi.fn()}
						onRequestAction={vi.fn()}
						onEditFundedDate={onEditFundedDate}
					/>
				</ul>
			)
			fireEvent.click(screen.getByRole('button', { name: /editar fecha de fondeo/i }))
			expect(onEditFundedDate).toHaveBeenCalledWith(3)
		})
	})
})
