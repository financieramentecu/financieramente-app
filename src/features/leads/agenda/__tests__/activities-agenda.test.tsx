import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ActivitiesAgenda } from '@/features/leads/agenda/activities-agenda'

const task = (id: number, overrides: object = {}) => ({
	idLeadTask: id,
	idLead: 40 + id,
	leadName: `Lead ${id}`,
	title: `Tarea ${id}`,
	type: 'CALL',
	dueAt: '2026-11-08T15:00:00.000Z',
	status: 'OPEN',
	completedAt: null,
	...overrides,
})

function mockAgenda(byBucket: Record<string, unknown[]>) {
	return vi.fn((url: string, init?: RequestInit) => {
		if (init?.method === 'PATCH') return Promise.resolve({ ok: true, json: async () => ({ data: {} }) })
		const bucket = new URL(url, 'http://x').searchParams.get('bucket') ?? ''
		return Promise.resolve({ ok: true, json: async () => ({ data: byBucket[bucket] ?? [] }) })
	})
}

describe('ActivitiesAgenda', () => {
	beforeEach(() => vi.restoreAllMocks())

	it('renders the four agenda groups with their tasks', async () => {
		vi.stubGlobal('fetch', mockAgenda({ overdue: [task(1)], today: [task(2, { type: 'MEETING' })], done: [task(3, { status: 'DONE', completedAt: '2026-11-09T10:00:00.000Z' })] }))
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)

		expect(await screen.findByText('Tarea 1')).toBeInTheDocument()
		expect(screen.getByText('Vencidas')).toBeInTheDocument()
		expect(screen.getByText('Hoy')).toBeInTheDocument()
		expect(screen.getByText('Próximas')).toBeInTheDocument()
		expect(screen.getByText('No tienes actividades próximas.')).toBeInTheDocument()
		expect(screen.getByText('Reunión')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Completar Tarea 3' })).not.toBeInTheDocument()
	})

	it('opens the lead when its name is clicked', async () => {
		vi.stubGlobal('fetch', mockAgenda({ today: [task(2)] }))
		const onOpenLead = vi.fn()
		render(<ActivitiesAgenda onOpenLead={onOpenLead} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Lead 2' }))
		expect(onOpenLead).toHaveBeenCalledWith(42)
	})

	it('completes a task and reloads the agenda', async () => {
		const fetchMock = mockAgenda({ overdue: [task(1)] })
		vi.stubGlobal('fetch', fetchMock)
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Completar Tarea 1' }))
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/crm/tasks/1',
				expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ action: 'complete' }) })
			)
		)
		await waitFor(() => expect(fetchMock.mock.calls.length).toBe(9))
	})

	it('shows an error when the agenda cannot load', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)
		expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar tus actividades')
	})
})
