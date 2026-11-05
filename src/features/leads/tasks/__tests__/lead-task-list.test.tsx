import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LeadTaskList } from '@/features/leads/tasks/lead-task-list'

describe('LeadTaskList', () => {
	it('creates a follow-up task using the assigned lead owner', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { idLeadTask: 1 } }) })
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
		vi.stubGlobal('fetch', fetchMock)
		render(<LeadTaskList leadId={4} assigneeId={7} enabled />)
		fireEvent.change(await screen.findByLabelText('Nueva tarea'), { target: { value: 'Enviar propuesta' } })
		fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/leads/4/tasks', expect.objectContaining({ method: 'POST' })))
	})
})
