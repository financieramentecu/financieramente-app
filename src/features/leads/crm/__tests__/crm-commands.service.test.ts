import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { appendLeadActivityTx } from '@/features/leads/activities/lead-activity.service'
import { completeLeadTaskTx, createLeadTaskTx, reassignLeadTaskTx, rescheduleLeadTaskTx } from '@/features/leads/tasks/lead-task.service'
import {
	addLeadSupportCaseCommentTx,
	createLeadSupportCaseTx,
	transitionLeadSupportCaseTx,
} from '@/features/leads/cases/lead-support-case.service'
import { appendLeadActivity } from '@/features/leads/activities/lead-activity-commands.service'
import {
	completeLeadTask,
	createLeadTask,
	findLeadTaskRef,
	listLeadTasks,
	reassignLeadTask,
	rescheduleLeadTask,
} from '@/features/leads/tasks/lead-task-commands.service'
import {
	addLeadSupportCaseComment,
	createLeadSupportCase,
	findLeadSupportCaseRef,
	listLeadSupportCases,
	transitionLeadSupportCase,
} from '@/features/leads/cases/lead-support-case-commands.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn((callback: (tx: unknown) => unknown) => callback({ tx: true })),
		leadTask: { findMany: vi.fn(), findUnique: vi.fn() },
		leadSupportCase: { findMany: vi.fn(), findUnique: vi.fn() },
		business: { findUnique: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))
vi.mock('@/features/leads/activities/lead-activity.service', () => ({ appendLeadActivityTx: vi.fn() }))
vi.mock('@/features/leads/tasks/lead-task.service', () => ({
	createLeadTaskTx: vi.fn(),
	completeLeadTaskTx: vi.fn(),
	reassignLeadTaskTx: vi.fn(),
	rescheduleLeadTaskTx: vi.fn(),
}))
vi.mock('@/features/leads/cases/lead-support-case.service', () => ({
	createLeadSupportCaseTx: vi.fn(),
	transitionLeadSupportCaseTx: vi.fn(),
	addLeadSupportCaseCommentTx: vi.fn(),
}))

const ctx = { userId: 7, email: 'a@x.co', ipAddress: '1.1.1.1', userAgent: 'ua' }

function expectAudit(action: AuditAction) {
	expect(logAuditEvent).toHaveBeenCalledWith(
		expect.objectContaining({ action, userId: 7, email: 'a@x.co', ipAddress: '1.1.1.1', userAgent: 'ua' })
	)
}

describe('CRM command services', () => {
	beforeEach(() => vi.clearAllMocks())

	it('appends an activity in a transaction and audits it', async () => {
		vi.mocked(appendLeadActivityTx).mockResolvedValue({ idLeadActivity: 9 } as never)
		await appendLeadActivity({ idLead: 1, type: 'NOTE_ADDED', payload: { note: 'x' } }, ctx)
		expect(appendLeadActivityTx).toHaveBeenCalledWith(
			{ tx: true },
			expect.objectContaining({ idLead: 1, idUser: 7, type: 'NOTE_ADDED', correlationId: expect.any(String) })
		)
		expectAudit(AuditAction.LEAD_ACTIVITY_CREATED)
	})

	it('lists the tasks of a lead', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([])
		await listLeadTasks(1)
		expect(prisma.leadTask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { idLead: 1 } }))
	})

	it('creates, completes and reassigns tasks with audit', async () => {
		vi.mocked(createLeadTaskTx).mockResolvedValue({ idLeadTask: 3 } as never)
		await createLeadTask({ idLead: 1, assignedTo: 7, title: 't' }, ctx)
		expectAudit(AuditAction.LEAD_TASK_CREATED)

		vi.mocked(completeLeadTaskTx).mockResolvedValue({ idLeadTask: 3 } as never)
		await completeLeadTask({ idLeadTask: 3, idLead: 1 }, ctx)
		expectAudit(AuditAction.LEAD_TASK_COMPLETED)

		vi.mocked(reassignLeadTaskTx).mockResolvedValue({ idLeadTask: 3 } as never)
		await reassignLeadTask({ idLeadTask: 3, idLead: 1, assignedTo: 8 }, ctx)
		expectAudit(AuditAction.LEAD_TASK_REASSIGNED)

		vi.mocked(rescheduleLeadTaskTx).mockResolvedValue({ idLeadTask: 3 } as never)
		await rescheduleLeadTask({ idLeadTask: 3, idLead: 1, dueAt: null }, ctx)
		expectAudit(AuditAction.LEAD_TASK_UPDATED)
	})

	it('finds a task reference', async () => {
		vi.mocked(prisma.leadTask.findUnique).mockResolvedValue({ idLeadTask: 3, idLead: 1, status: 'OPEN' } as never)
		await expect(findLeadTaskRef(3)).resolves.toEqual({ idLeadTask: 3, idLead: 1, status: 'OPEN' })
	})

	it('lists cases and finds a case reference', async () => {
		vi.mocked(prisma.leadSupportCase.findMany).mockResolvedValue([])
		await listLeadSupportCases(1)
		expect(prisma.leadSupportCase.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { idLead: 1 } }))
		vi.mocked(prisma.leadSupportCase.findUnique).mockResolvedValue({ idLeadSupportCase: 5, idLead: 1 } as never)
		await expect(findLeadSupportCaseRef(5)).resolves.toMatchObject({ idLeadSupportCase: 5 })
	})

	it('refuses to open a case on a missing business', async () => {
		vi.mocked(prisma.business.findUnique).mockResolvedValue(null)
		await expect(
			createLeadSupportCase({ idLead: 1, idBusiness: 99, subject: 's', priority: 'LOW' }, ctx)
		).resolves.toEqual({ ok: false, reason: 'BUSINESS_NOT_FOUND' })
		expect(createLeadSupportCaseTx).not.toHaveBeenCalled()
	})

	it('opens, transitions and comments cases with audit', async () => {
		vi.mocked(createLeadSupportCaseTx).mockResolvedValue({ idLeadSupportCase: 5 } as never)
		await expect(
			createLeadSupportCase({ idLead: 1, subject: 's', priority: 'LOW' }, ctx)
		).resolves.toEqual({ ok: true, supportCase: { idLeadSupportCase: 5 } })
		expectAudit(AuditAction.LEAD_SUPPORT_CASE_CREATED)

		vi.mocked(transitionLeadSupportCaseTx).mockResolvedValue({ idLeadSupportCase: 5 } as never)
		await transitionLeadSupportCase({ idLeadSupportCase: 5, idLead: 1, status: 'RESOLVED' }, ctx)
		expectAudit(AuditAction.LEAD_SUPPORT_CASE_UPDATED)

		vi.mocked(addLeadSupportCaseCommentTx).mockResolvedValue({ idLeadSupportCaseComment: 2 } as never)
		await addLeadSupportCaseComment({ idLeadSupportCase: 5, idLead: 1, body: 'b' }, ctx)
		expectAudit(AuditAction.LEAD_SUPPORT_CASE_COMMENTED)
	})
})
