import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ActivitiesAgenda } from '@/features/leads/agenda/activities-agenda'
import { dueAtForActivityBucket } from '@/features/leads/agenda/activity-bucket'
import { activityDueCardText } from '@/features/leads/agenda/activity-due-label'

const now = new Date()

const task = (id: number, overrides: object = {}) => ({
	idLeadTask: id,
	idLead: 40 + id,
	leadName: `Lead ${id}`,
	title: `Tarea ${id}`,
	type: 'CALL',
	dueAt: dueAtForActivityBucket('overdue', now).toISOString(),
	status: 'OPEN',
	completedAt: null,
	createdAt: now.toISOString(),
	assigneeName: 'Ana Torres',
	creatorName: 'Ana Torres',
	commentCount: 1,
	...overrides,
})

function mockBoard(tasks: unknown[], cases: unknown[] = []) {
	return vi.fn((url: string, init?: RequestInit) => {
		if (typeof url === 'string' && url.includes('activity-comments')) {
			return Promise.resolve({
				ok: true,
				json: async () => ({ data: [{ id: 9, body: 'Ya llamé', createdAt: now.toISOString(), authorName: 'Ana' }] }),
			})
		}
		if (init?.method === 'PATCH') return Promise.resolve({ ok: true, json: async () => ({ data: {} }) })
		return Promise.resolve({ ok: true, json: async () => ({ data: { tasks, cases } }) })
	})
}

describe('ActivitiesAgenda', () => {
	beforeEach(() => vi.clearAllMocks())

	it('renders the four time columns and places each task in its column', async () => {
		vi.stubGlobal('fetch', mockBoard([
			task(1, { title: 'Atrasada' }),
			task(2, { dueAt: dueAtForActivityBucket('today', now).toISOString(), title: 'De hoy' }),
			task(3, { dueAt: dueAtForActivityBucket('upcoming', now).toISOString(), title: 'Por vencer' }),
			task(4, { status: 'DONE', completedAt: now.toISOString(), title: 'Hecha' }),
		]))
		render(<ActivitiesAgenda onOpenLead={vi.fn()} onOpenActivity={vi.fn()} />)

		expect(await screen.findByText('Atrasada')).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Vencidas' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Vencen hoy' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Próximas a vencer' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Completadas' })).toBeInTheDocument()
		expect(screen.getByText('De hoy')).toBeInTheDocument()
		expect(screen.getByText('Por vencer')).toBeInTheDocument()
		expect(screen.getByText('Hecha')).toBeInTheDocument()
		expect(screen.getAllByText('Llamada').length).toBeGreaterThan(0)
		expect(screen.getAllByText(activityDueCardText(dueAtForActivityBucket('overdue', now).toISOString(), 'Vence')).length).toBeGreaterThan(0)
	})

	it('shows a configured activity label and the settings action for a manager', async () => {
		vi.stubGlobal('fetch', mockBoard([task(1, { title: 'Visitar', typeLabel: 'Visita', typeColor: '#111111' })]))
		render(<ActivitiesAgenda onOpenLead={vi.fn()} onOpenActivity={vi.fn()} canConfigure />)
		expect(await screen.findByText('Visita')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Etiquetas' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Columnas' })).toBeInTheDocument()
	})

	it('shows renamed column headers from the catalogue', async () => {
		vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
			if (url.includes('activity-columns')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: [
							{ code: 'overdue', name: 'Atrasadas', position: 0 },
							{ code: 'today', name: 'Para hoy', position: 1 },
							{ code: 'upcoming', name: 'En camino', position: 2 },
							{ code: 'done', name: 'Listas', position: 3 },
						],
					}),
				})
			}
			return mockBoard([task(1, { title: 'Atrasada' })])(url, init)
		})
		render(<ActivitiesAgenda onOpenLead={vi.fn()} onOpenActivity={vi.fn()} />)
		expect(await screen.findByRole('region', { name: 'Atrasadas' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Para hoy' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'En camino' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Listas' })).toBeInTheDocument()
	})

	it('shows a custom column and keeps a pinned task there', async () => {
		vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
			if (url.includes('activity-columns')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						data: [
							{ code: 'overdue', name: 'Vencidas', position: 0 },
							{ code: 'xabc', name: 'Seguimiento', position: 4 },
						],
					}),
				})
			}
			return mockBoard([task(1, { title: 'En seguimiento', columnCode: 'xabc' })])(url, init)
		})
		render(<ActivitiesAgenda onOpenLead={vi.fn()} onOpenActivity={vi.fn()} canConfigure />)
		const custom = await screen.findByRole('region', { name: 'Seguimiento' })
		expect(within(custom).getByText('En seguimiento')).toBeInTheDocument()
		expect(within(screen.getByRole('region', { name: 'Vencidas' })).queryByText('En seguimiento')).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Columnas' }))
		expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Eliminar columna Seguimiento' })).toBeInTheDocument()
	})

	it('opens the lead when its name is clicked', async () => {
		vi.stubGlobal('fetch', mockBoard([task(2)]))
		const onOpenLead = vi.fn()
		render(<ActivitiesAgenda onOpenLead={onOpenLead} onOpenActivity={vi.fn()} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Lead 2' }))
		expect(onOpenLead).toHaveBeenCalledWith(42, 'Lead 2')
	})

	it('opens the lead record when a case card is clicked', async () => {
		vi.stubGlobal('fetch', mockBoard([], [{
			idLeadSupportCase: 5,
			idLead: 8,
			leadName: 'Lead caso',
			subject: 'Pago devuelto',
			status: 'OPEN',
			priority: 'HIGH',
			dueAt: dueAtForActivityBucket('today', now).toISOString(),
			resolvedAt: null,
			createdAt: now.toISOString(),
			assigneeName: 'Ana Torres',
			commentCount: 1,
		}]))
		const onOpenActivity = vi.fn()
		render(<ActivitiesAgenda onOpenLead={vi.fn()} onOpenActivity={onOpenActivity} />)
		fireEvent.click(await screen.findByText('Pago devuelto'))
		expect(onOpenActivity).toHaveBeenCalledWith(8, { kind: 'case', id: 5 }, 'Lead caso')
	})

	it('filters the board to tasks or cases', async () => {
		vi.stubGlobal('fetch', mockBoard([task(1, { title: 'Llamar cliente' })], [{
			idLeadSupportCase: 5,
			idLead: 8,
			leadName: 'Lead caso',
			subject: 'Pago devuelto',
			status: 'OPEN',
			priority: 'HIGH',
			dueAt: dueAtForActivityBucket('today', now).toISOString(),
			resolvedAt: null,
			createdAt: now.toISOString(),
			assigneeName: 'Ana Torres',
			commentCount: 0,
		}]))
		render(<ActivitiesAgenda onOpenLead={vi.fn()} onOpenActivity={vi.fn()} />)
		expect(await screen.findByText('Llamar cliente')).toBeInTheDocument()
		expect(screen.getByText('Pago devuelto')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Casos' }))
		expect(screen.queryByText('Llamar cliente')).not.toBeInTheDocument()
		expect(screen.getByText('Pago devuelto')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Tareas' }))
		expect(screen.getByText('Llamar cliente')).toBeInTheDocument()
		expect(screen.queryByText('Pago devuelto')).not.toBeInTheDocument()
	})

	it('shows an error when the board cannot load', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
		render(<ActivitiesAgenda onOpenLead={vi.fn()} onOpenActivity={vi.fn()} />)
		expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar las actividades')
	})
})
