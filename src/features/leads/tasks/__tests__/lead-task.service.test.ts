import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	addLeadTaskCommentTx,
	completeLeadTaskTx,
	createLeadTaskTx,
	reassignLeadTaskTx,
	rescheduleLeadTaskTx,
} from '@/features/leads/tasks/lead-task.service'

const create = vi.fn()
const update = vi.fn()
const findUnique = vi.fn()
const commentCreate = vi.fn()
const appendLeadActivityTx = vi.fn()

vi.mock('@/features/leads/activities/lead-activity.service', () => ({
	appendLeadActivityTx: (...args: unknown[]) => appendLeadActivityTx(...args),
}))

const tx = { leadTask: { create, update, findUnique }, leadTaskComment: { create: commentCreate } }

describe('lead task service', () => {
	beforeEach(() => vi.clearAllMocks())

	it('creates an open task and records exactly one task-created activity', async () => {
		create.mockResolvedValue({ idLeadTask: 10, idLead: 4 })
		appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 1 })

		await createLeadTaskTx(tx as never, {
			idLead: 4,
			assignedTo: 8,
			createdBy: 7,
			title: 'Llamar para confirmar documentos',
			dueAt: new Date('2026-11-06T15:00:00.000Z'),
			correlationId: 'task-4-create-1',
		})

		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				idLead: 4,
				assignedTo: 8,
				createdBy: 7,
				status: 'OPEN',
			}),
		})
		expect(appendLeadActivityTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				idLead: 4,
				idUser: 7,
				type: 'TASK_CREATED',
			})
		)
	})

	it('completes an open task once and appends a completion activity', async () => {
		update.mockResolvedValue({ idLeadTask: 10, idLead: 4 })
		appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 2 })

		await completeLeadTaskTx(tx as never, {
			idLeadTask: 10,
			idLead: 4,
			completedBy: 7,
			correlationId: 'task-4-complete-1',
		})

		expect(update).toHaveBeenCalledWith({
			where: { idLeadTask: 10 },
			data: expect.objectContaining({ status: 'DONE', completedAt: expect.any(Date) }),
		})
		expect(appendLeadActivityTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ type: 'TASK_COMPLETED', idLead: 4, idUser: 7 })
	)
	})

	it('reassigns an open task and records the new assignee without mutating a business', async () => {
		update.mockResolvedValue({ idLeadTask: 10, idLead: 4 })
		appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 3 })

		await reassignLeadTaskTx(tx as never, {
			idLeadTask: 10,
			idLead: 4,
			assignedTo: 9,
			reassignedBy: 7,
			correlationId: 'task-4-reassign-1',
		})

		expect(update).toHaveBeenCalledWith({
			where: { idLeadTask: 10 },
			data: { assignedTo: 9 },
		})
		expect(appendLeadActivityTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ type: 'TASK_REASSIGNED', idLead: 4, idUser: 7 })
	)
	})

	it('stores the task type on create', async () => {
		create.mockResolvedValue({ idLeadTask: 11, idLead: 4, title: 't' })
		await createLeadTaskTx(tx as never, { idLead: 4, assignedTo: 8, createdBy: 7, title: 't', type: 'MEETING', correlationId: 'c' })
		expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'MEETING' }) })
	})

	it('records a task comment on the lead timeline', async () => {
		findUnique.mockResolvedValue({ title: 'Llamar' })
		commentCreate.mockResolvedValue({ idLeadTaskComment: 4 })
		appendLeadActivityTx.mockResolvedValue({ idLeadActivity: 4 })

		await addLeadTaskCommentTx(tx as never, {
			idLeadTask: 10,
			idLead: 4,
			authorId: 7,
			body: 'Volví a llamar',
			correlationId: 'task-4-comment-1',
		})

		expect(commentCreate).toHaveBeenCalledWith({
			data: { idLeadTask: 10, authorId: 7, body: 'Volví a llamar' },
		})
		expect(appendLeadActivityTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				type: 'TASK_COMMENTED',
				idLead: 4,
				idUser: 7,
				payload: expect.objectContaining({ action: 'COMMENTED', comment: 'Volví a llamar', title: 'Llamar' }),
			})
		)
	})

	it('reschedules a task and clears its reminder so it fires again', async () => {
		update.mockResolvedValue({ idLeadTask: 10 })
		const dueAt = new Date('2026-11-12T15:00:00.000Z')
		await rescheduleLeadTaskTx(tx as never, { idLeadTask: 10, dueAt })
		expect(update).toHaveBeenCalledWith({
			where: { idLeadTask: 10 },
			data: { dueAt, reminderSentAt: null, columnCode: null },
		})
		expect(appendLeadActivityTx).not.toHaveBeenCalled()
	})
})
