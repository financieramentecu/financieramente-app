import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeadFunnelColumnView } from '@/features/leads/components/lead-funnel-column-view'
import type { LeadBoardColumn } from '@/features/leads/types/lead.types'

const column: LeadBoardColumn = {
	idLeadFunnelColumn: 1,
	name: 'Nuevo',
	position: 0,
	isFallback: false,
	leads: [
		{
			idLead: 1,
			name: 'Juan',
			lastName: 'Perez',
			email: 'juan@example.com',
			phone: null,
			originTag: null,
			idUser: 5,
			ownerName: 'Ana Torres',
			outcomeStatus: 'OPEN',
			idBusiness: null,
		},
	],
}

describe('LeadFunnelColumnView', () => {
	it('renders leads without any drag-and-drop affordance', () => {
		const { container: root } = render(<LeadFunnelColumnView column={column} />)

		expect(screen.getByText('Juan Perez')).toBeInTheDocument()
		expect(root.querySelector('[draggable="true"]')).toBeNull()
		expect(root.querySelector('[data-dnd-kit-draggable]')).toBeNull()
	})

	it('never renders a "create lead" or "add" control', () => {
		render(<LeadFunnelColumnView column={column} />)
		expect(screen.queryByRole('button', { name: /crear|agregar|nuevo lead/i })).not.toBeInTheDocument()
	})
})
