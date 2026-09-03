import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import type { LeadDetail } from '@/features/leads/types/lead.types'

const mockDeleteLead = vi.fn()
let mockState: { status: string; data: unknown; error: string } = {
	status: 'idle',
	data: undefined,
	error: '',
}

vi.mock('@/features/leads/hooks/use-delete-lead', () => ({
	useDeleteLead: () => ({ state: mockState, deleteLead: mockDeleteLead }),
}))

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
	beforeEach(() => {
		vi.clearAllMocks()
		mockState = { status: 'idle', data: undefined, error: '' }
	})

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

describe('LeadDetailSheet — admin delete', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockState = { status: 'idle', data: undefined, error: '' }
	})

	it('hides the delete action for a non-admin', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={false}
			/>
		)
		expect(
			screen.queryByRole('button', { name: /eliminar lead/i })
		).not.toBeInTheDocument()
	})

	it('hides the delete action for an admin viewing an ineligible (WON) lead', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'WON' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
			/>
		)
		expect(
			screen.queryByRole('button', { name: /eliminar lead/i })
		).not.toBeInTheDocument()
	})

	it('shows the delete action for an admin viewing an eligible lead', () => {
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
			/>
		)
		expect(
			screen.getByRole('button', { name: /eliminar lead/i })
		).toBeInTheDocument()
	})

	it('opens a confirmation dialog on click without issuing the DELETE request', async () => {
		const user = userEvent.setup()
		render(
			<LeadDetailSheet
				lead={buildLead({ idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
			/>
		)

		await user.click(screen.getByRole('button', { name: /eliminar lead/i }))

		expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
		expect(mockDeleteLead).not.toHaveBeenCalled()
	})

	it('confirming the dialog triggers the delete flow and calls onDeleted on success', async () => {
		const onDeleted = vi.fn()
		mockDeleteLead.mockImplementation(async () => {
			mockState = { status: 'success', data: { idLead: 1 }, error: '' }
		})
		const user = userEvent.setup()
		const { rerender } = render(
			<LeadDetailSheet
				lead={buildLead({ idLead: 1, idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
				onDeleted={onDeleted}
			/>
		)

		await user.click(screen.getByRole('button', { name: /eliminar lead/i }))
		await screen.findByRole('alertdialog')
		await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

		await waitFor(() => expect(mockDeleteLead).toHaveBeenCalledWith(1))

		rerender(
			<LeadDetailSheet
				lead={buildLead({ idLead: 1, idBusiness: null, outcomeStatus: 'OPEN' })}
				open={true}
				onOpenChange={vi.fn()}
				isAdmin={true}
				onDeleted={onDeleted}
			/>
		)

		await waitFor(() => expect(onDeleted).toHaveBeenCalled())
	})
})
