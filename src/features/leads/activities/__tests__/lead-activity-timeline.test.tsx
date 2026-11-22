import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LeadActivityTimeline } from '@/features/leads/activities/lead-activity-timeline'
import { formatDateBogota } from '@/features/shared/lib/format-date'

describe('LeadActivityTimeline', () => {
	it('does not expose CRM timeline data while the feature is disabled', () => {
		render(<LeadActivityTimeline leadId={1} enabled={false} />)
		expect(screen.queryByText('Línea de tiempo')).not.toBeInTheDocument()
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
								payload: {
									note: 'Seguimiento agendado',
									attachments: [
										{ name: 'foto.png', mimeType: 'image/png', size: 10, key: 'leads/1/a' },
										{ name: 'cotizacion.pdf', mimeType: 'application/pdf', size: 20, key: 'leads/1/b' },
									],
								},
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
		expect(screen.getByRole('heading', { name: formatDateBogota('2026-11-05T10:00:00.000Z') })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Ampliar foto.png' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Descargar cotizacion.pdf' })).toHaveAttribute(
			'href',
			'/api/leads/1/activities/1/files/1'
		)
	})

	it('creates a plain-text note through the lead activity API', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { items: [], nextCursor: null } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { idLeadActivity: 2 } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { items: [], nextCursor: null } }),
			})
		vi.stubGlobal('fetch', fetchMock)

		render(<LeadActivityTimeline leadId={1} enabled />)
		fireEvent.change(await screen.findByLabelText('Detalle'), {
			target: { value: 'Llamar el viernes' },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/leads/1/activities',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({
						type: 'NOTE_ADDED',
						payload: { note: 'Llamar el viernes' },
					}),
				})
			)
		)
	})

	it('sends selected files together with the note', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { items: [], nextCursor: null } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { idLeadActivity: 4 } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { items: [], nextCursor: null } }),
			})
		vi.stubGlobal('fetch', fetchMock)

		render(<LeadActivityTimeline leadId={1} enabled />)
		const file = new File(['hola'], 'nota.txt', { type: 'text/plain' })
		fireEvent.change(await screen.findByLabelText('Adjuntar archivos'), {
			target: { files: [file] },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

		await waitFor(() => {
			const posted = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST')
			expect(posted?.[1].body).toBeInstanceOf(FormData)
			expect((posted?.[1].body as FormData).get('files')).toBe(file)
		})
	})

	it('logs a call with its outcome', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { items: [], nextCursor: null } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { idLeadActivity: 3 } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { items: [], nextCursor: null } }),
			})
		vi.stubGlobal('fetch', fetchMock)

		render(<LeadActivityTimeline leadId={1} enabled />)
		fireEvent.change(await screen.findByLabelText('Tipo de actividad'), {
			target: { value: 'CALL_LOGGED' },
		})
		fireEvent.change(screen.getByLabelText('Resultado'), {
			target: { value: 'NO_ANSWER' },
		})
		fireEvent.change(screen.getByLabelText('Detalle'), {
			target: { value: 'Sin respuesta' },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/leads/1/activities',
				expect.objectContaining({
					body: JSON.stringify({
						type: 'CALL_LOGGED',
						payload: { summary: 'Sin respuesta', outcome: 'NO_ANSWER' },
					}),
				})
			)
		)
	})

	it('renders stage changes and loads more pages', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: {
						items: [
							{
								kind: 'stage_change',
								idLeadStageHistory: 4,
								occurredAt: '2026-11-05T10:00:00.000Z',
								actorName: null,
								fromColumnName: 'Nuevo',
								toColumnName: 'Contactado',
								source: 'CRM_SYNC',
							},
						],
						nextCursor: '2026-11-05T10:00:00.000Z|stage_change|4',
					},
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { items: [], nextCursor: null } }),
			})
		vi.stubGlobal('fetch', fetchMock)

		render(<LeadActivityTimeline leadId={1} enabled />)
		expect(await screen.findByText('Nuevo → Contactado')).toBeInTheDocument()
		expect(screen.getByText(/Asesor/)).toBeInTheDocument()
		expect(screen.queryByText(/GHL/)).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				'/api/leads/1/activities?limit=25&cursor=2026-11-05T10%3A00%3A00.000Z%7Cstage_change%7C4'
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
	expect(
		await screen.findByText('Lead convertido a negocio')
	).toBeInTheDocument()
	expect(screen.getByText('Negocio #77')).toBeInTheDocument()
})
