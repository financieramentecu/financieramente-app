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
	assigneeName: 'Ana Torres',
	...overrides,
})

function mockBoard(tasks: unknown[]) {
	return vi.fn((url: string, init?: RequestInit) => {
		if (init?.method === 'PATCH') return Promise.resolve({ ok: true, json: async () => ({ data: {} }) })
		return Promise.resolve({ ok: true, json: async () => ({ data: tasks }) })
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

	it('shows an error when the board cannot load', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
		render(<ActivitiesAgenda onOpenLead={vi.fn()} />)
		expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar las actividades')
	})
})
