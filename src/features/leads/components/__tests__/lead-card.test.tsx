import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LeadCard } from '@/features/leads/components/lead-card'
import { LEAD_OUTCOME_STATUS_LABELS } from '@/features/leads/lib/lead-outcome-status'
import type { LeadCard as LeadCardType } from '@/features/leads/types/lead.types'
import type { LeadOutcomeStatus } from '@prisma/client'

vi.mock('@/features/shared/ui/tooltip', () => ({
	TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
	Tooltip: ({ children }: { children: React.ReactNode }) => children,
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div role="tooltip">{children}</div>
	),
}))

function buildLead(overrides: Partial<LeadCardType> = {}): LeadCardType {
	return {
		idLead: 1,
		name: 'Juan',
		lastName: 'Perez',
		email: 'juan@example.com',
		phone: '3001234567',
		originTag: 'facebook',
		idUser: 5,
		ownerName: 'Ana Torres',
		outcomeStatus: 'OPEN',
		idBusiness: null,
		inactiveDays: null,
		tags: [],
		estimatedValue: null,
		...overrides,
	}
}

const ENUM_VALUES: LeadOutcomeStatus[] = ['OPEN', 'WON', 'LOST', 'ABANDONED']

describe('LeadCard — outcome badge', () => {
	it.each(ENUM_VALUES)(
		'renders the correct label for outcomeStatus %s',
		(outcomeStatus) => {
			render(<LeadCard lead={buildLead({ outcomeStatus })} onClick={vi.fn()} />)
			expect(
				screen.getByText(LEAD_OUTCOME_STATUS_LABELS[outcomeStatus])
			).toBeInTheDocument()
		}
	)

	it('renders the badge without altering the card contact fields', () => {
		render(
			<LeadCard lead={buildLead({ outcomeStatus: 'WON' })} onClick={vi.fn()} />
		)
		expect(screen.getByText('Juan Perez')).toBeInTheDocument()
		expect(screen.getByText('juan@example.com')).toBeInTheDocument()
		expect(screen.getByText(LEAD_OUTCOME_STATUS_LABELS.WON)).toBeInTheDocument()
	})
})

describe('LeadCard — converted-lead indicator (idBusiness)', () => {
	it('shows a star icon with a "Negocio creado" tooltip and a distinct border/background when idBusiness is not null', () => {
		const { container } = render(
			<LeadCard lead={buildLead({ idBusiness: 42 })} onClick={vi.fn()} />
		)

		expect(screen.getByLabelText('Negocio creado')).toBeInTheDocument()
		expect(container.querySelector('svg.lucide-star')).not.toBeNull()
		expect(screen.getByRole('tooltip')).toHaveTextContent('Negocio creado')
		expect(container.querySelector('.border-emerald-300')).not.toBeNull()
	})

	it('shows neither the icon nor the distinct styling when idBusiness is null', () => {
		const { container } = render(
			<LeadCard lead={buildLead({ idBusiness: null })} onClick={vi.fn()} />
		)

		expect(screen.queryByLabelText('Negocio creado')).not.toBeInTheDocument()
		expect(container.querySelector('.border-emerald-300')).toBeNull()
	})

	it('keeps showing the indicator even when the underlying data implies a cancelled linked business (idBusiness stays non-null)', () => {
		render(<LeadCard lead={buildLead({ idBusiness: 42 })} onClick={vi.fn()} />)
		expect(screen.getByLabelText('Negocio creado')).toBeInTheDocument()
	})
})

describe('LeadCard — owner avatar', () => {
	it('renders the owner name and initials avatar when ownerName is present', () => {
		render(
			<LeadCard
				lead={buildLead({ ownerName: 'Ana Torres' })}
				onClick={vi.fn()}
			/>
		)
		expect(screen.getByText('Ana Torres')).toBeInTheDocument()
		expect(screen.getByText('AT')).toBeInTheDocument()
	})

	it('renders no owner avatar or name when the lead has no owner', () => {
		render(<LeadCard lead={buildLead({ ownerName: null })} onClick={vi.fn()} />)
		expect(screen.queryByText('AT')).not.toBeInTheDocument()
	})
})

describe('LeadCard — origin label', () => {
	it('renders the origin as a colored label', () => {
		render(
			<LeadCard
				lead={buildLead({ originTag: 'Money Strategy' })}
				onClick={vi.fn()}
			/>
		)
		expect(screen.getByText('Money Strategy')).toHaveClass('rounded-full')
	})

	it('gives different origins different colors', () => {
		const { rerender } = render(
			<LeadCard
				lead={buildLead({ originTag: 'Money Strategy' })}
				onClick={vi.fn()}
			/>
		)
		const strategy = screen.getByText('Money Strategy').className
		rerender(
			<LeadCard lead={buildLead({ originTag: 'Monimpas' })} onClick={vi.fn()} />
		)
		expect(screen.getByText('Monimpas').className).not.toBe(strategy)
	})

	it('hides the origin label when the lead has none', () => {
		render(<LeadCard lead={buildLead({ originTag: null })} onClick={vi.fn()} />)
		expect(screen.queryByText('facebook')).not.toBeInTheDocument()
	})
})

describe('LeadCard — inactivity', () => {
	it('shows the stale badge for idle open leads', () => {
		render(
			<LeadCard lead={buildLead({ inactiveDays: 10 })} onClick={vi.fn()} />
		)
		expect(screen.getByText('Sin actividad · 10 días')).toBeInTheDocument()
	})
})

describe('LeadCard — grouped captures', () => {
	it('opens only the selected opportunity and retains both capture options', () => {
		const onClick = vi.fn()
		const capture = {
			idLeadCapture: 1,
			name: 'Diagnóstico',
			level: 1,
			status: true,
		}
		const second = {
			idLeadCapture: 2,
			name: 'Programa',
			level: 2,
			status: true,
		}
		const captures = [capture, second].map((item, index) => ({
			idLead: index + 1,
			capture: item,
			referrerName: 'María',
			originTag: 'Propio',
			idLeadFunnelColumn: index + 1,
			outcomeStatus: 'OPEN' as const,
			createdAt: '2026-11-24T10:00:00Z',
		}))
		render(
			<LeadCard
				lead={buildLead({ capture, captures, referrerName: 'María' })}
				onClick={onClick}
			/>
		)
		fireEvent.change(
			screen.getByRole('combobox', { name: 'Captura / oportunidad' }),
			{ target: { value: '2' } }
		)
		expect(onClick).toHaveBeenCalledExactlyOnceWith(2)
		expect(screen.getAllByRole('option')).toHaveLength(2)
		expect(screen.getByText('Referido por: María')).toBeInTheDocument()
		expect(captures.every((item) => item.capture.status)).toBe(true)
	})
})
