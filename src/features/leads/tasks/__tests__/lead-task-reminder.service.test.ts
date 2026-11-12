import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/features/email/lib/email-service'
import { notificationProvider } from '@/features/shared/services/notifications/sse-notification-provider'
import { sendDailyTaskDigest, sendDueTaskReminders } from '@/features/leads/tasks/lead-task-reminder.service'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadTask: { findMany: vi.fn(), updateMany: vi.fn() },
		notification: { create: vi.fn() },
	},
}))
vi.mock('@/features/email/lib/email-service', () => ({ sendEmail: vi.fn() }))
vi.mock('@/features/shared/services/notifications/sse-notification-provider', () => ({
	notificationProvider: { sendNotification: vi.fn() },
}))

const now = new Date('2026-11-09T15:00:00Z')
const task = (id: number, dueIso: string, assignedTo = 7) => ({
	idLeadTask: id,
	idLead: 40 + id,
	title: `Tarea ${id}`,
	dueAt: new Date(dueIso),
	assignedTo,
	lead: { name: 'Ana', lastName: null },
})

describe('sendDueTaskReminders', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(notificationProvider.sendNotification).mockResolvedValue(undefined)
	})

	it('selects open, due, un-reminded tasks on active leads', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([])
		await sendDueTaskReminders(now)
		expect(vi.mocked(prisma.leadTask.findMany).mock.calls[0][0]?.where).toEqual({
			status: 'OPEN',
			dueAt: { lte: now },
			reminderSentAt: null,
			lead: { active: true },
		})
	})

	it('claims each task before notifying, so overlapping runs notify once', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([task(1, '2026-11-09T14:55:00Z'), task(2, '2026-11-09T10:00:00Z')] as never)
		vi.mocked(prisma.leadTask.updateMany).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
		vi.mocked(prisma.notification.create).mockResolvedValue({ idNotification: 1 } as never)

		const summary = await sendDueTaskReminders(now)

		expect(prisma.leadTask.updateMany).toHaveBeenCalledWith({
			where: { idLeadTask: 1, reminderSentAt: null },
			data: { reminderSentAt: now },
		})
		expect(prisma.notification.create).toHaveBeenCalledTimes(1)
		expect(prisma.notification.create).toHaveBeenCalledWith({
			data: {
				idUser: 7,
				title: 'Actividad para ahora',
				message: 'Tarea 1 · Ana',
				callbackUrl: '/dashboard/negocios/crm?tab=actividades&lead=41',
			},
		})
		expect(notificationProvider.sendNotification).toHaveBeenCalledTimes(1)
		expect(summary).toEqual({ processed: 2, notified: 1, failed: 0 })
	})

	it('titles long-overdue tasks as overdue', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([task(2, '2026-11-09T10:00:00Z')] as never)
		vi.mocked(prisma.leadTask.updateMany).mockResolvedValue({ count: 1 })
		vi.mocked(prisma.notification.create).mockResolvedValue({ idNotification: 1 } as never)
		await sendDueTaskReminders(now)
		expect(vi.mocked(prisma.notification.create).mock.calls[0][0].data.title).toBe('Actividad vencida')
	})

	it('isolates failures and reports them', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([task(1, '2026-11-09T14:55:00Z'), task(2, '2026-11-09T14:56:00Z')] as never)
		vi.mocked(prisma.leadTask.updateMany).mockResolvedValue({ count: 1 })
		vi.mocked(prisma.notification.create).mockRejectedValueOnce(new Error('db')).mockResolvedValueOnce({ idNotification: 2 } as never)
		const summary = await sendDueTaskReminders(now)
		expect(summary).toEqual({ processed: 2, notified: 1, failed: 1 })
		expect(Sentry.captureException).toHaveBeenCalled()
	})
})

describe('sendDailyTaskDigest', () => {
	beforeEach(() => vi.clearAllMocks())

	it('emails each assignee once with overdue and today tasks', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([
			{ ...task(1, '2026-11-08T15:00:00Z'), assignee: { email: 'ana@x.co', name: 'Ana', active: true } },
			{ ...task(2, '2026-11-09T20:00:00Z'), assignee: { email: 'ana@x.co', name: 'Ana', active: true } },
			{ ...task(3, '2026-11-09T20:00:00Z', 8), assignee: { email: 'luis@x.co', name: 'Luis', active: true } },
		] as never)
		vi.mocked(sendEmail).mockResolvedValue({ success: true } as never)

		const summary = await sendDailyTaskDigest(now)

		expect(vi.mocked(prisma.leadTask.findMany).mock.calls[0][0]?.where).toEqual({
			status: 'OPEN',
			dueAt: { lt: new Date('2026-11-10T05:00:00Z') },
			lead: { active: true },
			assignee: { active: true },
		})
		expect(sendEmail).toHaveBeenCalledTimes(2)
		expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({ to: 'ana@x.co', subject: 'Tus actividades del CRM: 1 vencida, 1 para hoy' })
		expect(summary).toEqual({ processed: 2, emailed: 2, failed: 0 })
	})

	it('sends nothing when there is nothing pending', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([])
		expect(await sendDailyTaskDigest(now)).toEqual({ processed: 0, emailed: 0, failed: 0 })
		expect(sendEmail).not.toHaveBeenCalled()
	})

	it('keeps going when one email fails', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([
			{ ...task(1, '2026-11-08T15:00:00Z'), assignee: { email: 'ana@x.co', name: 'Ana', active: true } },
			{ ...task(3, '2026-11-09T20:00:00Z', 8), assignee: { email: 'luis@x.co', name: 'Luis', active: true } },
		] as never)
		vi.mocked(sendEmail).mockResolvedValueOnce({ success: false, error: 'x' } as never).mockResolvedValueOnce({ success: true } as never)
		expect(await sendDailyTaskDigest(now)).toEqual({ processed: 2, emailed: 1, failed: 1 })
	})
})
