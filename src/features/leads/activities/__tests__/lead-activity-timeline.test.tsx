import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LeadActivityTimeline } from '@/features/leads/activities/lead-activity-timeline'

describe('LeadActivityTimeline', () => {
	it('does not expose CRM timeline data while the feature is disabled', () => {
		render(<LeadActivityTimeline leadId={1} enabled={false} />)
		expect(screen.queryByText('Timeline')).not.toBeInTheDocument()
	})

	it('renders typed timeline events with no raw JSON payload', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: {
						items: [
							{
								idLeadActivity: 1,
								type: 'NOTE_ADDED',
								occurredAt: '2026-11-05T10:00:00.000Z',
								actorName: 'Ana',
								payload: { note: 'Seguimiento agendado' },
							},
						],
						nextCursor: null,
					},
				}),
			})
		)

		render(<LeadActivityTimeline leadId={1} enabled />)
		expect(await screen.findByText('Seguimiento agendado')).toBeInTheDocument()
		expect(screen.getByText('Nota de seguimiento')).toBeInTheDocument()
	})

	it('creates a plain-text note through the lead activity API', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { items: [] } }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { idLeadActivity: 2 } }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { items: [] } }) })
		vi.stubGlobal('fetch', fetchMock)

		render(<LeadActivityTimeline leadId={1} enabled />)
		fireEvent.change(await screen.findByLabelText('Nueva nota'), {
			target: { value: 'Llamar el viernes' },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Agregar nota' }))

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/leads/1/activities',
				expect.objectContaining({ method: 'POST' })
			)
		)
	})
})

it('renders conversion events with a business link label without exposing raw payload', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: {
					items: [
						{
							idLeadActivity: 2,
							type: 'CONVERTED',
							occurredAt: '2026-11-05T10:00:00.000Z',
							actorName: 'Ana',
							payload: { businessId: 77 },
						},
					],
					nextCursor: null,
				},
			}),
		})
	)

	render(<LeadActivityTimeline leadId={1} enabled />)
	expect(await screen.findByText('Lead convertido a negocio')).toBeInTheDocument()
	expect(screen.getByText('Negocio #77')).toBeInTheDocument()
})
