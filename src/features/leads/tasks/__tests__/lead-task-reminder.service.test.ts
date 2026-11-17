import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/features/email/lib/email-service'
import { notificationProvider } from '@/features/shared/services/notifications/sse-notification-provider'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { getAnticipationDays } from '@/features/leads/tasks/crm-notification-setting.service'
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
vi.mock('@/features/leads/tasks/crm-notification-setting.service', () => ({
	getAnticipationDays: vi.fn(),
}))

const now = new Date('2026-11-09T15:00:00Z')
const dayStart = new Date('2026-11-09T05:00:00Z')
const dayEnd = new Date('2026-11-10T05:00:00Z')

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
		vi.mocked(getAnticipationDays).mockResolvedValue(1)
		vi.mocked(notificationProvider.sendNotification).mockResolvedValue(undefined)
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([])
	})

	it('selects open tasks due today and inside the anticipation window', async () => {
		await sendDueTaskReminders(now)
		expect(prisma.leadTask.findMany).toHaveBeenCalledTimes(2)
		expect(vi.mocked(prisma.leadTask.findMany).mock.calls[0][0]?.where).toEqual({
			status: 'OPEN',
			dueAt: { gte: dayStart, lt: dayEnd },
			reminderSentAt: null,
			lead: { active: true },
		})
		expect(vi.mocked(prisma.leadTask.findMany).mock.calls[1][0]?.where).toEqual({
			status: 'OPEN',
			dueAt: { gte: dayEnd, lt: new Date('2026-11-11T05:00:00Z') },
			advanceNotifiedAt: null,
			lead: { active: true },
		})
	})

	it('skips the upcoming query when anticipation is 0', async () => {
		vi.mocked(getAnticipationDays).mockResolvedValue(0)
		await sendDueTaskReminders(now)
		expect(prisma.leadTask.findMany).toHaveBeenCalledTimes(1)
	})

	it('claims today and upcoming separately, and names the due date', async () => {
		const today = task(1, '2026-11-09T20:00:00Z')
		const upcoming = task(2, '2026-11-10T15:00:00Z')
		vi.mocked(prisma.leadTask.findMany).mockResolvedValueOnce([today] as never).mockResolvedValueOnce([upcoming] as never)
		vi.mocked(prisma.leadTask.updateMany).mockResolvedValue({ count: 1 })
		vi.mocked(prisma.notification.create).mockResolvedValue({ idNotification: 1 } as never)

		const summary = await sendDueTaskReminders(now)

		expect(prisma.leadTask.updateMany).toHaveBeenNthCalledWith(1, {
			where: { idLeadTask: 1, reminderSentAt: null },
			data: { reminderSentAt: now },
		})
		expect(prisma.leadTask.updateMany).toHaveBeenNthCalledWith(2, {
			where: { idLeadTask: 2, advanceNotifiedAt: null },
			data: { advanceNotifiedAt: now },
		})
		expect(prisma.notification.create).toHaveBeenNthCalledWith(1, {
			data: {
				idUser: 7,
				title: 'Actividad para hoy',
				message: `Tarea 1 · Ana · vence ${formatDateTimeBogota(today.dueAt)}`,
				callbackUrl: '/dashboard/negocios/crm?tab=actividades&lead=41',
			},
		})
		expect(vi.mocked(prisma.notification.create).mock.calls[1][0].data.title).toBe('Actividad próxima a vencer')
		expect(summary).toEqual({ processed: 2, notified: 2, failed: 0 })
	})

	it('does not notify a task another run already claimed', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValueOnce([task(1, '2026-11-09T20:00:00Z')] as never).mockResolvedValueOnce([])
		vi.mocked(prisma.leadTask.updateMany).mockResolvedValue({ count: 0 })
		const summary = await sendDueTaskReminders(now)
		expect(prisma.notification.create).not.toHaveBeenCalled()
		expect(summary).toEqual({ processed: 1, notified: 0, failed: 0 })
	})

	it('isolates failures and reports them', async () => {
		vi.mocked(prisma.leadTask.findMany)
			.mockResolvedValueOnce([task(1, '2026-11-09T20:00:00Z'), task(2, '2026-11-09T21:00:00Z')] as never)
			.mockResolvedValueOnce([])
		vi.mocked(prisma.leadTask.updateMany).mockResolvedValue({ count: 1 })
		vi.mocked(prisma.notification.create).mockRejectedValueOnce(new Error('db')).mockResolvedValueOnce({ idNotification: 2 } as never)
		const summary = await sendDueTaskReminders(now)
		expect(summary).toEqual({ processed: 2, notified: 1, failed: 1 })
		expect(Sentry.captureException).toHaveBeenCalled()
	})
})

describe('sendDailyTaskDigest', () => {
	beforeEach(() => vi.clearAllMocks())

	it('emails each assignee once with overdue tasks only', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([
			{ ...task(1, '2026-11-08T15:00:00Z'), assignee: { email: 'ana@x.co', name: 'Ana', active: true } },
			{ ...task(3, '2026-11-08T15:00:00Z', 8), assignee: { email: 'luis@x.co', name: 'Luis', active: true } },
		] as never)
		vi.mocked(sendEmail).mockResolvedValue({ success: true } as never)

		const summary = await sendDailyTaskDigest(now)

		expect(vi.mocked(prisma.leadTask.findMany).mock.calls[0][0]?.where).toEqual({
			status: 'OPEN',
			dueAt: { lt: dayStart },
			lead: { active: true },
			assignee: { active: true },
		})
		expect(sendEmail).toHaveBeenCalledTimes(2)
		expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({
			to: 'ana@x.co',
			subject: 'Tus actividades vencidas del CRM: 1 vencida',
		})
		expect(vi.mocked(sendEmail).mock.calls[0][0].text).toContain('/dashboard/negocios/crm?tab=actividades&lead=41')
		expect(vi.mocked(sendEmail).mock.calls[0][0].html).toContain('Abrir en el CRM')
		expect(vi.mocked(sendEmail).mock.calls[0][0].html).not.toContain('Para hoy')
		expect(summary).toEqual({ processed: 2, emailed: 2, failed: 0 })
	})

	it('sends nothing when there is nothing overdue', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([])
		expect(await sendDailyTaskDigest(now)).toEqual({ processed: 0, emailed: 0, failed: 0 })
		expect(sendEmail).not.toHaveBeenCalled()
	})

	it('keeps going when one email fails', async () => {
		vi.mocked(prisma.leadTask.findMany).mockResolvedValue([
			{ ...task(1, '2026-11-08T15:00:00Z'), assignee: { email: 'ana@x.co', name: 'Ana', active: true } },
			{ ...task(3, '2026-11-08T15:00:00Z', 8), assignee: { email: 'luis@x.co', name: 'Luis', active: true } },
		] as never)
		vi.mocked(sendEmail).mockResolvedValueOnce({ success: false, error: 'x' } as never).mockResolvedValueOnce({ success: true } as never)
		expect(await sendDailyTaskDigest(now)).toEqual({ processed: 2, emailed: 1, failed: 1 })
	})
})
