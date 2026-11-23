import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LeadOwnerAssign } from '@/features/leads/components/lead-owner-assign'
import type { HierarchyAdvisor } from '@/features/leads/types/hierarchy-advisor.types'

const ADVISORS: HierarchyAdvisor[] = [
	{ idUser: 9, name: 'Laura Gomez' },
	{ idUser: 3, name: 'Ana Mendiola' },
]

describe('LeadOwnerAssign', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
				expect(init?.method).toBe('PATCH')
				expect(init?.body).toBe(JSON.stringify({ idUser: 9 }))
				return new Response(
					JSON.stringify({ data: { idUser: 9, ownerName: 'Laura Gomez' } }),
					{ status: 200 }
				)
			})
		)
	})

	it('searches the list and assigns only the chosen Money Strategy', async () => {
		const onAssigned = vi.fn()
		render(
			<LeadOwnerAssign
				idLead={12}
				idUser={null}
				ownerName={null}
				advisors={ADVISORS}
				advisorsReady
				onAssigned={onAssigned}
			/>
		)

		expect(screen.getByText('Sin Money Strategy')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('combobox', { name: 'Money Strategy disponibles' }))
		fireEvent.change(screen.getByRole('textbox', { name: 'Buscar Money Strategy' }), {
			target: { value: 'Laura' },
		})

		expect(screen.getByRole('option', { name: 'Laura Gomez' })).toBeInTheDocument()
		expect(screen.queryByRole('option', { name: 'Ana Mendiola' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('option', { name: 'Laura Gomez' }))
		expect(screen.getByRole('combobox', { name: 'Money Strategy disponibles' })).toHaveTextContent('Laura Gomez')
		expect(screen.queryByRole('option', { name: 'Ana Mendiola' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Asignar Money Strategy' }))

		await waitFor(() => {
			expect(onAssigned).toHaveBeenCalledWith({
				idUser: 9,
				ownerName: 'Laura Gomez',
			})
		})
	})

	it('shows the assigned Money Strategy as the selected option', () => {
		render(
			<LeadOwnerAssign
				idLead={12}
				idUser={9}
				ownerName="Laura Gomez"
				advisors={ADVISORS}
				advisorsReady
			/>
		)

		expect(screen.getByRole('combobox', { name: 'Money Strategy disponibles' })).toHaveTextContent(
			'Laura Gomez'
		)
	})

	it('keeps the assigned Money Strategy visible when they are outside the hierarchy list', () => {
		render(
			<LeadOwnerAssign
				idLead={12}
				idUser={4}
				ownerName="Camilo Asesor"
				advisors={ADVISORS}
				advisorsReady
			/>
		)

		fireEvent.click(screen.getByRole('combobox', { name: 'Money Strategy disponibles' }))
		expect(screen.getByRole('combobox', { name: 'Money Strategy disponibles' })).toHaveTextContent(
			'Camilo Asesor'
		)
		expect(screen.getByRole('option', { name: 'Camilo Asesor' })).toBeInTheDocument()
	})
})
