import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LeadOwnerAssign } from '@/features/leads/components/lead-owner-assign'

describe('LeadOwnerAssign', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input)
				if (url.endsWith('/api/crm/advisors')) {
					return new Response(
						JSON.stringify({ data: [{ idUser: 9, name: 'Laura Gomez' }] }),
						{ status: 200 }
					)
				}
				expect(init?.method).toBe('PATCH')
				expect(init?.body).toBe(JSON.stringify({ idUser: 9 }))
				return new Response(
					JSON.stringify({ data: { idUser: 9, ownerName: 'Laura Gomez' } }),
					{
						status: 200,
					}
				)
			})
		)
	})

	it('lists hierarchy advisors and assigns the selected one', async () => {
		const onAssigned = vi.fn()
		render(
			<LeadOwnerAssign
				idLead={12}
				idUser={null}
				ownerName={null}
				onAssigned={onAssigned}
			/>
		)

		expect(screen.getByText('Sin Money Strategy')).toBeInTheDocument()
		await waitFor(() => {
			expect(
				screen.getByRole('option', { name: 'Laura Gomez' })
			).toBeInTheDocument()
		})

		fireEvent.change(
			screen.getByRole('combobox', { name: 'Money Strategy disponibles' }),
			{
				target: { value: '9' },
			}
		)
		fireEvent.click(screen.getByRole('button', { name: 'Asignar Money Strategy' }))

		await waitFor(() => {
			expect(onAssigned).toHaveBeenCalledWith({
				idUser: 9,
				ownerName: 'Laura Gomez',
			})
		})
	})
})
