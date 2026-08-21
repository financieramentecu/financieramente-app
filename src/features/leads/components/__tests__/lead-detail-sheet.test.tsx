import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import type { LeadDetail } from '@/features/leads/types/lead.types'

function buildLead(overrides: Partial<LeadDetail> = {}): LeadDetail {
	return {
		idLead: 1,
		externalCrmId: 'crm-1',
		name: 'Juan',
		lastName: 'Perez',
		email: 'juan@example.com',
		phone: '3001234567',
		identityNumber: '123456789',
		originTag: 'facebook',
		externalUrl: null,
		idUser: 5,
		ownerName: 'Ana Torres',
		idLeadFunnelColumn: 1,
		idBusiness: null,
		outcomeStatus: 'OPEN',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}
}

describe('LeadDetailSheet', () => {
	it('renders "Ver en CRM" when externalUrl is present', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ externalUrl: 'https://crm.example/lead/1' })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Ver en CRM')).toBeInTheDocument()
	})

	it('does not render "Ver en CRM" when externalUrl is null', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ externalUrl: null })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.queryByText('Ver en CRM')).not.toBeInTheDocument()
	})

	it('shows "Convertir a negocio" when the lead is not yet converted', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Convertir a negocio')).toBeInTheDocument()
		expect(screen.queryByText('Ver negocio')).not.toBeInTheDocument()
	})

	it('shows "Ver negocio" once the lead is converted', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: 42 })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Ver negocio')).toBeInTheDocument()
		expect(screen.queryByText('Convertir a negocio')).not.toBeInTheDocument()
	})

	it('renders the owner name and avatar when ownerName is present', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ ownerName: 'Ana Torres' })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Ana Torres')).toBeInTheDocument()
		expect(screen.getByText('AT')).toBeInTheDocument()
	})

	it('renders no owner avatar when the lead has no owner', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ ownerName: null })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		expect(screen.queryByText('AT')).not.toBeInTheDocument()
	})
})

describe('LeadDetailSheet — conversion requires an owner', () => {
	it('renders "Convertir a negocio" as an active link when the lead has an owner', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idUser: 5, idBusiness: null })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		const link = screen.getByText('Convertir a negocio').closest('a')
		expect(link).toHaveAttribute('href', '/dashboard/negocios/crear?leadId=1')
	})

	it('disables "Convertir a negocio" and shows an explanatory caption when the lead has no owner', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idUser: null, idBusiness: null })}
				open={true}
				onOpenChange={vi.fn()}
			/>
		)
		const button = screen.getByRole('button', { name: 'Convertir a negocio' })
		expect(button).toBeDisabled()
		expect(screen.queryByText('Convertir a negocio')?.closest('a')).toBeNull()
		expect(
			screen.getByText(/asigna un owner/i)
		).toBeInTheDocument()
	})
})
