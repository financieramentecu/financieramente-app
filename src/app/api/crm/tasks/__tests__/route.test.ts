import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { PATCH } from '../[id]/route'
import { requireCrmActor, findScopedLead } from '@/lib/auth/require-crm-actor'
import { getTaskAgenda, getActivityBoard } from '@/features/leads/tasks/lead-task-agenda.service'
import {
	completeLeadTask,
	findLeadTaskRef,
	reassignLeadTask,
	reopenLeadTask,
	rescheduleLeadTask,
} from '@/features/leads/tasks/lead-task-commands.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
	findScopedLead: vi.fn(),
}))
vi.mock('@/features/leads/tasks/lead-task-agenda.service', () => ({ getTaskAgenda: vi.fn(), getActivityBoard: vi.fn() }))
vi.mock('@/features/leads/tasks/lead-task-commands.service', () => ({
	completeLeadTask: vi.fn(),
	findLeadTaskRef: vi.fn(),
	reassignLeadTask: vi.fn(),
	rescheduleLeadTask: vi.fn(),
	reopenLeadTask: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: { json: vi.fn((data, init) => ({ status: init?.status ?? 200, json: () => Promise.resolve(data) })) },
}))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7, 8], canManage: true, idCategory: null }
const patch = (body: unknown) =>
	new Request('http://x', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/crm/tasks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('returns the viewer agenda for a valid bucket', async () => {
		vi.mocked(getTaskAgenda).mockResolvedValue([])
		const response = await GET(new Request('http://x/?bucket=overdue'))
		expect(response.status).toBe(200)
		expect(getTaskAgenda).toHaveBeenCalledWith(7, 'overdue')
		expect(requireCrmActor).toHaveBeenCalledWith('crm_tasks')
	})

	it('returns hierarchy tasks for the board view, narrowed to requested advisors', async () => {
		vi.mocked(getActivityBoard).mockResolvedValue([])
		const response = await GET(new Request('http://x/?view=board&owner=8&owner=99'))
		expect(response.status).toBe(200)
		expect(getActivityBoard).toHaveBeenCalledWith([8])
	})

	it('rejects unknown buckets', async () => {
		expect((await GET(new Request('http://x/?bucket=all'))).status).toBe(400)
	})

	it('propagates the guard response', async () => {
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: false, response: { status: 404 } as never })
		expect((await GET(new Request('http://x/?bucket=today'))).status).toBe(404)
	})
})

describe('PATCH /api/crm/tasks/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
		vi.mocked(findLeadTaskRef).mockResolvedValue({ idLeadTask: 3, idLead: 1, status: 'OPEN' } as never)
		vi.mocked(findScopedLead).mockResolvedValue(true)
	})

	it('404s for a task outside the viewer scope', async () => {
		vi.mocked(findScopedLead).mockResolvedValue(false)
		expect((await PATCH(patch({ action: 'complete' }), ctx('3'))).status).toBe(404)
	})

	it('409s for a closed task', async () => {
		vi.mocked(findLeadTaskRef).mockResolvedValue({ idLeadTask: 3, idLead: 1, status: 'DONE' } as never)
		expect((await PATCH(patch({ action: 'complete' }), ctx('3'))).status).toBe(409)
	})

	it('completes a task', async () => {
		vi.mocked(completeLeadTask).mockResolvedValue({ idLeadTask: 3 } as never)
		expect((await PATCH(patch({ action: 'complete' }), ctx('3'))).status).toBe(200)
		expect(completeLeadTask).toHaveBeenCalledWith({ idLeadTask: 3, idLead: 1 }, expect.objectContaining({ userId: 7 }))
	})

	it('reassigns only within scope', async () => {
		expect((await PATCH(patch({ action: 'reassign', assignedTo: 99 }), ctx('3'))).status).toBe(403)
		vi.mocked(reassignLeadTask).mockResolvedValue({ idLeadTask: 3 } as never)
		expect((await PATCH(patch({ action: 'reassign', assignedTo: 8 }), ctx('3'))).status).toBe(200)
	})

	it('reschedules a task', async () => {
		vi.mocked(rescheduleLeadTask).mockResolvedValue({ idLeadTask: 3 } as never)
		const dueAt = '2026-11-12T15:00:00.000Z'
		expect((await PATCH(patch({ action: 'reschedule', dueAt }), ctx('3'))).status).toBe(200)
		expect(rescheduleLeadTask).toHaveBeenCalledWith(
			{ idLeadTask: 3, idLead: 1, dueAt: new Date(dueAt) },
			expect.objectContaining({ userId: 7 })
		)
	})

	it('moves an open task by rescheduling it into the target column', async () => {
		vi.mocked(rescheduleLeadTask).mockResolvedValue({ idLeadTask: 3 } as never)
		expect((await PATCH(patch({ action: 'move', bucket: 'today' }), ctx('3'))).status).toBe(200)
		expect(rescheduleLeadTask).toHaveBeenCalledWith(
			expect.objectContaining({ idLeadTask: 3, idLead: 1, dueAt: expect.any(Date) }),
			expect.objectContaining({ userId: 7 })
		)
	})

	it('reopens a completed task when it is dragged back to an open column', async () => {
		vi.mocked(findLeadTaskRef).mockResolvedValue({ idLeadTask: 3, idLead: 1, status: 'DONE' } as never)
		vi.mocked(reopenLeadTask).mockResolvedValue({ idLeadTask: 3 } as never)
		expect((await PATCH(patch({ action: 'move', bucket: 'overdue' }), ctx('3'))).status).toBe(200)
		expect(reopenLeadTask).toHaveBeenCalled()
	})
})
