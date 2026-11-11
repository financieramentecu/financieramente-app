import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ActivitiesAgenda } from '@/features/leads/agenda/activities-agenda'
import { dueAtForActivityBucket } from '@/features/leads/agenda/activity-bucket'

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
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)

		expect(await screen.findByText('Atrasada')).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Vencidas' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Vencen hoy' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Próximas a vencer' })).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Completadas' })).toBeInTheDocument()
		expect(screen.getByText('De hoy')).toBeInTheDocument()
		expect(screen.getByText('Por vencer')).toBeInTheDocument()
		expect(screen.getByText('Hecha')).toBeInTheDocument()
	})

	it('opens the lead when its name is clicked', async () => {
		vi.stubGlobal('fetch', mockBoard([task(2)]))
		const onOpenLead = vi.fn()
		render(<ActivitiesAgenda onOpenLead={onOpenLead} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Lead 2' }))
		expect(onOpenLead).toHaveBeenCalledWith(42)
	})

	it('shows a case and opens its comments without dragging', async () => {
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
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)
		fireEvent.click(await screen.findByText('Pago devuelto'))
		expect(await screen.findByText('Ya llamé')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Completar caso' })).toBeInTheDocument()
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
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)
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
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)
		expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar las actividades')
	})
})
