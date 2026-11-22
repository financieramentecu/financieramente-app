import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LeadTaskList } from '@/features/leads/tasks/lead-task-list'

const openTask = { idLeadTask: 5, title: 'Enviar propuesta', type: 'EMAIL', dueAt: '2026-11-10T14:30:00.000Z', status: 'OPEN', assignedTo: 7, completedAt: null, assignee: { name: 'Ana', lastName: null } }

describe('LeadTaskList', () => {
	it('creates a typed task with a Bogotá due date for the lead owner', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { idLeadTask: 1 } }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
		vi.stubGlobal('fetch', fetchMock)
		render(<LeadTaskList leadId={4} assigneeId={7} enabled />)
		fireEvent.change(await screen.findByLabelText('Nueva tarea'), { target: { value: 'Enviar propuesta' } })
		fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'CALL' } })
		fireEvent.change(screen.getByLabelText('Vence (hora Bogotá)'), { target: { value: '2026-11-10T09:30' } })
		fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/leads/4/tasks',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ title: 'Enviar propuesta', assignedTo: 7, type: 'CALL', dueAt: '2026-11-10T14:30:00.000Z' }),
				})
			)
		)
	})

	it('adds a comment on a task', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			if (url.includes('activity-comments') && init?.method === 'POST') {
				return { ok: true, json: async () => ({ data: { id: 1 } }) }
			}
			if (url.includes('activity-comments')) {
				return { ok: true, json: async () => ({ data: [] }) }
			}
			return { ok: true, json: async () => ({ data: [openTask] }) }
		})
		vi.stubGlobal('fetch', fetchMock)
		render(<LeadTaskList leadId={4} assigneeId={7} enabled />)
		fireEvent.click(await screen.findByRole('button', { name: 'Comentarios' }))
		expect(await screen.findByText('Sin comentarios')).toBeInTheDocument()
		fireEvent.change(screen.getByLabelText('Agregar comentario'), { target: { value: 'Llamé de nuevo' } })
		fireEvent.click(screen.getByRole('button', { name: 'Agregar comentario' }))
		expect(await screen.findByText('Llamé de nuevo')).toBeInTheDocument()
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/crm/activity-comments',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ kind: 'task', id: 5, body: 'Llamé de nuevo' }),
			})
		)
	})

	it('completes an open task', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [openTask] }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
		vi.stubGlobal('fetch', fetchMock)
		render(<LeadTaskList leadId={4} assigneeId={7} enabled />)
		expect(await screen.findByText('Email')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Completar Enviar propuesta' })).toHaveClass('bg-primary')
		fireEvent.click(screen.getByRole('button', { name: 'Completar Enviar propuesta' }))
		fireEvent.change(screen.getByLabelText('Qué pasó'), { target: { value: 'El cliente aceptó' } })
		const file = new File(['ok'], 'acuerdo.pdf', { type: 'application/pdf' })
		fireEvent.change(screen.getByLabelText('Adjuntar archivos'), { target: { files: [file] } })
		fireEvent.click(screen.getByRole('button', { name: 'Completar tarea' }))
		await waitFor(() => {
			const posted = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH')
			expect(posted?.[0]).toBe('/api/crm/tasks/5')
			expect(posted?.[1].body).toBeInstanceOf(FormData)
			expect((posted?.[1].body as FormData).get('event')).toBe(
				JSON.stringify({ action: 'complete', comment: 'El cliente aceptó' })
			)
			expect((posted?.[1].body as FormData).get('files')).toBe(file)
		})
	})
})
