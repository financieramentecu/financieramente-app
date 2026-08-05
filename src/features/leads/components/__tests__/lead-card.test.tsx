import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeadCard } from '@/features/leads/components/lead-card'
import { LEAD_OUTCOME_STATUS_LABELS } from '@/features/leads/lib/lead-outcome-status'
import type { LeadCard as LeadCardType } from '@/features/leads/types/lead.types'
import type { LeadOutcomeStatus } from '@prisma/client'

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
		render(<LeadCard lead={buildLead({ outcomeStatus: 'WON' })} onClick={vi.fn()} />)
		expect(screen.getByText('Juan Perez')).toBeInTheDocument()
		expect(screen.getByText('juan@example.com')).toBeInTheDocument()
		expect(screen.getByText(LEAD_OUTCOME_STATUS_LABELS.WON)).toBeInTheDocument()
	})
})

describe('LeadCard — owner avatar', () => {
	it('renders the owner name and initials avatar when ownerName is present', () => {
		render(<LeadCard lead={buildLead({ ownerName: 'Ana Torres' })} onClick={vi.fn()} />)
		expect(screen.getByText('Ana Torres')).toBeInTheDocument()
		expect(screen.getByText('AT')).toBeInTheDocument()
	})

	it('renders no owner avatar or name when the lead has no owner', () => {
		render(<LeadCard lead={buildLead({ ownerName: null })} onClick={vi.fn()} />)
		expect(screen.queryByText('AT')).not.toBeInTheDocument()
	})
})
