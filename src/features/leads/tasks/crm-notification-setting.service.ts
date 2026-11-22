import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import { TASK_NOTICE_ANTICIPATION, TASK_NOTICE_SETTING_ID } from '@/features/leads/tasks/task-notice.constants'
import type { TaskNoticeSetting } from '@/features/leads/tasks/task-notice.schema'

export async function getTaskNoticeSetting(): Promise<TaskNoticeSetting> {
	const row = await prisma.crmNotificationSetting.findUnique({
		where: { id: TASK_NOTICE_SETTING_ID },
		select: { anticipationDays: true },
	})
	return { anticipationDays: row?.anticipationDays ?? TASK_NOTICE_ANTICIPATION.DEFAULT_DAYS }
}

export async function getAnticipationDays(): Promise<number> {
	return (await getTaskNoticeSetting()).anticipationDays
}

/** Saves the anticipation window. Administration only; audited. */
export async function saveTaskNoticeSetting(anticipationDays: number, ctx: CrmRequestContext): Promise<TaskNoticeSetting> {
	const row = await prisma.crmNotificationSetting.upsert({
		where: { id: TASK_NOTICE_SETTING_ID },
		create: { id: TASK_NOTICE_SETTING_ID, anticipationDays, updatedBy: ctx.userId },
		update: { anticipationDays, updatedBy: ctx.userId },
		select: { anticipationDays: true },
	})
	await auditCrmEvent(
		ctx,
		AuditAction.CRM_TASK_NOTICE_UPDATED,
		`CRM task notice anticipation set to ${anticipationDays} days`
	)
	return row
}
