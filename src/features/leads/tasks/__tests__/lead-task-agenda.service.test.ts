import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getTaskAgenda } from '@/features/leads/tasks/lead-task-agenda.service'

vi.mock('@/lib/prisma', () => ({ prisma: { leadTask: { findMany: vi.fn() } } }))

describe('getTaskAgenda', () => {
	beforeEach(() => vi.clearAllMocks())

	it('queries only the viewer tasks on active leads and maps the lead name', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([
			{
				idLeadTask: 3,
				idLead: 12,
				title: 'Llamar',
				type: 'CALL',
				dueAt: new Date('2026-11-08T15:00:00Z'),
				status: 'OPEN',
				completedAt: null,
				lead: { name: 'Ana', lastName: 'Pérez' },
			},
		] as never)
		const now = new Date('2026-11-09T15:00:00Z')

		const items = await getTaskAgenda(7, 'overdue', now)

		const args = vi.mocked(prisma.leadTask.findMany).mock.calls[0][0]
		expect(args?.where).toEqual({
			assignedTo: 7,
			lead: { active: true },
			status: 'OPEN',
			dueAt: { lt: new Date('2026-11-09T05:00:00Z') },
		})
		expect(items).toEqual([
			{
				idLeadTask: 3,
				idLead: 12,
				leadName: 'Ana Pérez',
				title: 'Llamar',
				type: 'CALL',
				dueAt: new Date('2026-11-08T15:00:00Z'),
				status: 'OPEN',
				completedAt: null,
			},
		])
	})

	it('orders done tasks by completion desc and others by due date asc', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([])
		await getTaskAgenda(7, 'done', new Date())
		expect(vi.mocked(prisma.leadTask.findMany).mock.calls[0][0]?.orderBy).toEqual([{ completedAt: 'desc' }])
		await getTaskAgenda(7, 'today', new Date())
		expect(vi.mocked(prisma.leadTask.findMany).mock.calls[1][0]?.orderBy).toEqual([{ dueAt: 'asc' }, { idLeadTask: 'asc' }])
	})
})
