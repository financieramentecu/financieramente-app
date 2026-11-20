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
import { getBogotaDayBounds } from '@/features/leads/tasks/agenda-bucket-range'

const REMINDER_BATCH = 500
const JUST_DUE_WINDOW_MS = 15 * 60 * 1000

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

function leadDisplayName(lead: { name: string | null; lastName: string | null }): string {
	return [lead.name, lead.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

export function taskCallbackUrl(idLead: number): string {
	return `/dashboard/negocios/crm?tab=actividades&lead=${idLead}`
}

/**
 * Notifies the assignee once per open task whose due time has passed.
 * Each task is claimed (`reminderSentAt`) before notifying so overlapping
 * runs never double-notify; a missed run is caught up by the next one.
 */
export async function sendDueTaskReminders(now: Date = new Date()): Promise<ReminderSummary> {
	const tasks = await prisma.leadTask.findMany({
		where: { status: 'OPEN', dueAt: { lte: now }, reminderSentAt: null, lead: { active: true } },
		orderBy: { dueAt: 'asc' },
		take: REMINDER_BATCH,
		select: {
			idLeadTask: true,
			idLead: true,
			title: true,
			dueAt: true,
			assignedTo: true,
			lead: { select: { name: true, lastName: true } },
		},
	})

	const summary: ReminderSummary = { processed: tasks.length, notified: 0, failed: 0 }
	for (const task of tasks) {
		try {
			const claim = await prisma.leadTask.updateMany({
				where: { idLeadTask: task.idLeadTask, reminderSentAt: null },
				data: { reminderSentAt: now },
			})
			if (claim.count !== 1) continue

			const justDue = task.dueAt !== null && now.getTime() - task.dueAt.getTime() <= JUST_DUE_WINDOW_MS
			const notification = await prisma.notification.create({
				data: {
					idUser: task.assignedTo,
					title: justDue ? 'Actividad para ahora' : 'Actividad vencida',
					message: `${task.title} · ${leadDisplayName(task.lead)}`,
					callbackUrl: taskCallbackUrl(task.idLead),
				},
			})
			await notificationProvider.sendNotification(task.assignedTo, notification).catch((error) => {
				Sentry.captureException(error)
			})
			summary.notified += 1
		} catch (error) {
			summary.failed += 1
			Sentry.captureException(error)
		}
	}
	return summary
}

/** One email per active assignee with open tasks that are overdue or due today (Bogotá). */
export async function sendDailyTaskDigest(now: Date = new Date()): Promise<DigestSummary> {
	const { start, end } = getBogotaDayBounds(now)
	const tasks = await prisma.leadTask.findMany({
		where: { status: 'OPEN', dueAt: { lt: end }, lead: { active: true }, assignee: { active: true } },
		orderBy: [{ assignedTo: 'asc' }, { dueAt: 'asc' }],
		select: {
			idLeadTask: true,
			title: true,
			dueAt: true,
			assignedTo: true,
			lead: { select: { name: true, lastName: true } },
			assignee: { select: { email: true, name: true } },
		},
	})

	const byAssignee = new Map<number, { email: string; name: string; overdue: DigestTask[]; today: DigestTask[] }>()
	for (const task of tasks) {
		if (!task.dueAt) continue
		const bucket = byAssignee.get(task.assignedTo) ?? { email: task.assignee.email, name: task.assignee.name, overdue: [], today: [] }
		const item: DigestTask = { title: task.title, leadName: leadDisplayName(task.lead), dueAt: task.dueAt }
		if (task.dueAt < start) bucket.overdue.push(item)
		else bucket.today.push(item)
		byAssignee.set(task.assignedTo, bucket)
	}

	const baseUrl = resolveEmailBaseUrl()
	const summary: DigestSummary = { processed: byAssignee.size, emailed: 0, failed: 0 }
	for (const recipient of byAssignee.values()) {
		const params = { recipientName: recipient.name, overdue: recipient.overdue, today: recipient.today, baseUrl }
		try {
			const result = await sendEmail({
				to: recipient.email,
				subject: buildCrmTaskDigestSubject(recipient.overdue.length, recipient.today.length),
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
