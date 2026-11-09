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

	it('completes an open task', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [openTask] }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
		vi.stubGlobal('fetch', fetchMock)
		render(<LeadTaskList leadId={4} assigneeId={7} enabled />)
		expect(await screen.findByText('Email')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Completar Enviar propuesta' }))
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/crm/tasks/5', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ action: 'complete' }) }))
		)
	})
})
