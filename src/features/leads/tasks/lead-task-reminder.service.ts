import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/features/email/lib/email-service'
import { resolveEmailBaseUrl } from '@/features/email/lib/account-link-email'
import {
	buildCrmTaskDigestSubject,
	renderCrmTaskDigestHtml,
	renderCrmTaskDigestText,
	type DigestTask,
} from '@/features/email/lib/crm-task-digest-email'
import { notificationProvider } from '@/features/shared/services/notifications/sse-notification-provider'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { getBogotaDayBounds } from '@/features/leads/tasks/agenda-bucket-range'
import { getAnticipationDays } from '@/features/leads/tasks/crm-notification-setting.service'

const REMINDER_BATCH = 500
const DAY_MS = 24 * 60 * 60 * 1000

const NOTICE_KIND = {
	TODAY: 'today',
	UPCOMING: 'upcoming',
} as const

type NoticeKind = (typeof NOTICE_KIND)[keyof typeof NOTICE_KIND]

const NOTICE_COPY: Record<NoticeKind, { title: string; claimField: 'reminderSentAt' | 'advanceNotifiedAt' }> = {
	today: { title: 'Actividad para hoy', claimField: 'reminderSentAt' },
	upcoming: { title: 'Actividad próxima a vencer', claimField: 'advanceNotifiedAt' },
}

export interface ReminderSummary {
	processed: number
	notified: number
	failed: number
}

export interface DigestSummary {
	processed: number
	emailed: number
	failed: number
}

interface NoticeTask {
	idLeadTask: number
	idLead: number
	title: string
	dueAt: Date | null
	assignedTo: number
	lead: { name: string | null; lastName: string | null }
}

const taskSelect = {
	idLeadTask: true,
	idLead: true,
	title: true,
	dueAt: true,
	assignedTo: true,
	lead: { select: { name: true, lastName: true } },
} as const

function leadDisplayName(lead: { name: string | null; lastName: string | null }): string {
	return [lead.name, lead.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

export function taskCallbackUrl(idLead: number): string {
	return `/dashboard/negocios/crm?tab=actividades&lead=${idLead}`
}

function taskNoticeMessage(task: NoticeTask): string {
	const due = task.dueAt ? formatDateTimeBogota(task.dueAt) : 'sin fecha'
	return `${task.title} · ${leadDisplayName(task.lead)} · vence ${due}`
}

/**
 * In-app notices only.
 * Today: one notice on the Bogotá day the task is due.
 * Upcoming: one notice when the task enters the configured anticipation window.
 * Overdue tasks are not notified here; they go out by email once a day.
 * Completed and cancelled tasks are excluded (`status: OPEN`).
 */
export async function sendDueTaskReminders(now: Date = new Date()): Promise<ReminderSummary> {
	const anticipationDays = await getAnticipationDays()
	const { start, end } = getBogotaDayBounds(now)
	const upcomingEnd = new Date(end.getTime() + anticipationDays * DAY_MS)

	const [todayTasks, upcomingTasks] = await Promise.all([
		prisma.leadTask.findMany({
			where: { status: 'OPEN', dueAt: { gte: start, lt: end }, reminderSentAt: null, lead: { active: true } },
			orderBy: { dueAt: 'asc' },
			take: REMINDER_BATCH,
			select: taskSelect,
		}),
		anticipationDays === 0
			? Promise.resolve([])
			: prisma.leadTask.findMany({
					where: {
						status: 'OPEN',
						dueAt: { gte: end, lt: upcomingEnd },
						advanceNotifiedAt: null,
						lead: { active: true },
					},
					orderBy: { dueAt: 'asc' },
					take: REMINDER_BATCH,
					select: taskSelect,
				}),
	])

	const summary: ReminderSummary = {
		processed: todayTasks.length + upcomingTasks.length,
		notified: 0,
		failed: 0,
	}
	const queue: Array<{ task: NoticeTask; kind: NoticeKind }> = [
		...todayTasks.map((task) => ({ task, kind: NOTICE_KIND.TODAY })),
		...upcomingTasks.map((task) => ({ task, kind: NOTICE_KIND.UPCOMING })),
	]
	for (const item of queue) {
		const outcome = await notifyOnce(item.task, item.kind, now)
		if (outcome === 'notified') summary.notified += 1
		if (outcome === 'failed') summary.failed += 1
	}
	return summary
}

async function notifyOnce(task: NoticeTask, kind: NoticeKind, now: Date): Promise<'notified' | 'skipped' | 'failed'> {
	const copy = NOTICE_COPY[kind]
	try {
		const claim = await prisma.leadTask.updateMany({
			where: { idLeadTask: task.idLeadTask, [copy.claimField]: null },
			data: { [copy.claimField]: now },
		})
		if (claim.count !== 1) return 'skipped'

		const notification = await prisma.notification.create({
			data: {
				idUser: task.assignedTo,
				title: copy.title,
				message: taskNoticeMessage(task),
				callbackUrl: taskCallbackUrl(task.idLead),
			},
		})
		await notificationProvider.sendNotification(task.assignedTo, notification).catch((error) => {
			Sentry.captureException(error)
		})
		return 'notified'
	} catch (error) {
		Sentry.captureException(error)
		return 'failed'
	}
}

/**
 * One email per active assignee, once a day (07:00 Bogotá cron), listing open
 * tasks that are already overdue. Today and upcoming tasks are not included.
 * A second run the same day can send again; the crontab is the frequency.
 */
export async function sendDailyTaskDigest(now: Date = new Date()): Promise<DigestSummary> {
	const { start } = getBogotaDayBounds(now)
	const tasks = await prisma.leadTask.findMany({
		where: { status: 'OPEN', dueAt: { lt: start }, lead: { active: true }, assignee: { active: true } },
		orderBy: [{ assignedTo: 'asc' }, { dueAt: 'asc' }],
		select: {
			idLeadTask: true,
			idLead: true,
			title: true,
			dueAt: true,
			assignedTo: true,
			lead: { select: { name: true, lastName: true } },
			assignee: { select: { email: true, name: true } },
		},
	})

	const byAssignee = new Map<number, { email: string; name: string; overdue: DigestTask[] }>()
	for (const task of tasks) {
		if (!task.dueAt) continue
		const bucket = byAssignee.get(task.assignedTo) ?? { email: task.assignee.email, name: task.assignee.name, overdue: [] }
		bucket.overdue.push({
			title: task.title,
			leadName: leadDisplayName(task.lead),
			dueAt: task.dueAt,
			detailPath: taskCallbackUrl(task.idLead),
		})
		byAssignee.set(task.assignedTo, bucket)
	}

	const baseUrl = resolveEmailBaseUrl()
	const summary: DigestSummary = { processed: byAssignee.size, emailed: 0, failed: 0 }
	for (const recipient of byAssignee.values()) {
		const params = { recipientName: recipient.name, overdue: recipient.overdue, baseUrl }
		try {
			const result = await sendEmail({
				to: recipient.email,
				subject: buildCrmTaskDigestSubject(recipient.overdue.length),
				html: renderCrmTaskDigestHtml(params),
				text: renderCrmTaskDigestText(params),
			})
			if (result.success) summary.emailed += 1
			else {
				summary.failed += 1
				Sentry.captureException(new Error(`CRM digest email failed: ${result.error ?? 'unknown'}`))
			}
		} catch (error) {
			summary.failed += 1
			Sentry.captureException(error)
		}
	}
	return summary
}
